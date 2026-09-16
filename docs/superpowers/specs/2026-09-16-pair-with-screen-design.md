# Pair with a Screen — design

**Date:** 2026-09-16 · **Status:** approved (user, 2026-09-16)

## Goal

A venue guest scans a QR code (or opens a link) for a specific screen or
speaker and lands on a new page, `/pair/[deviceSlug]`. After picking a display
name they're "paired" with that device's room and can:

- see exactly what the venue is playing / showing right now (song, schedule
  content, the ad currently airing),
- request a song that plays **next**, without disturbing the schedule / audio
  zone / room playlist (it plays once, then disappears from the list),
- see what's coming up (queued requests first, then the playlist),
- see who else is paired in the room and send reactions,
- optionally listen on their own phone, in sync (muted by default).

This is a new page, not a variant of `/rooms/[slug]` or `/zones/[slug]`
(both left untouched).

## Why the existing Zone Room doesn't already do this

1. `advanceScheduleTrack` never consults any queue, so a suggestion never plays
   while a schedule is active.
2. Repeat-mode playlists and schedule song lists compute "next" from the
   *current* track's index. A request isn't in the playlist, so index = -1 and
   the playlist restarts at song 1.
3. `/api/business/branches/advance` pops `room_queue` FIFO, and its genre
   fallback bulk-inserts 20 auto rows there — a guest suggestion lands behind
   up to 19 auto picks.
4. `nextQueuedZoneTrack` marks a row played before the CAS write; the losing
   kiosk of a race silently eats a suggestion.

## Decisions (confirmed with user)

| Question | Decision |
|---|---|
| What is "a screen"? | Any `branch_devices` row (screen or audio). The page resolves device → room → authoritative playback source. |
| URL | `/pair/[deviceSlug]`, slug = slugified device name + 6 hex chars (names repeat across branches). |
| Phone audio | Muted by default; "Listen on my phone" toggle syncs audio. |
| Request order | First come, first served. Likes shown, never reorder. |
| Ads on phones | Read-only mirror of what the room's screen is airing. Phones never call claim/impression endpoints. |
| Limits | 3 queued requests per guest per room, 50 per room, no duplicate of a queued or now-playing song. |

## Architecture

### Data (`supabase/business-pair-requests.sql`, applied by hand)

- `venue_requests` — `id, room_id → rooms, track jsonb, added_by text, added_by_name text, status ('queued'|'played'), claimed_at, created_at`. Index `(room_id, status, created_at)`. RLS on, no policies (service-role only).
- `venue_request_likes` — `(request_id → venue_requests, actor_id text)` PK.
- `playlist_cursor text` column on `room_playback`, `audio_zone_playback`, `schedule_playback`.
- `branch_devices.slug text unique` + `before insert` trigger that fills it + backfill of existing rows. No app-side insert site changes.

### Playback source resolution

`resolveRoomSource(roomId)` → `{kind:"schedule", id, roomIds}` | `{kind:"zone", id, roomIds}` | `{kind:"room", id, roomIds:[id]}` using the kiosk's own priority: active schedule with a live session → synchronized audio zone → the room. `roomIds` = every room that source plays in (schedule targets expanded to rooms; `audio_zone_rooms` for a zone).

### Request claiming (shared by all three advance paths)

`lib/pair/request-queue.ts`:

- `claimNextRequest(admin, roomIds)` — oldest `queued` row across `roomIds`; claim via conditional update `status='played' where id=? and status='queued'`; retry next candidate if 0 rows.
- `releaseRequest(admin, id)` — back to `queued` if the caller's CAS write lost.

Integration (request check sits at the very top of "what's next"):

- `advanceScheduleTrack` — claim before the playlist; CAS write; release on lost CAS.
- `advanceZonePlayback` — same; then the existing `audio_zone_queue` step (still used by `/zones`), then playlist/genres.
- `/api/business/branches/advance` — claim first, then existing `room_queue` step.

### Playlist cursor (the "don't disturb the playlist" rule)

- `basis = playlist_cursor ?? currentTrack.youtubeId` is what repeat-playlist and schedule-song "next index" math uses.
- A request write sets `playlist_cursor = basis` (preserves the resume point).
- Every other advance write sets `playlist_cursor = null` (restores today's exact behaviour).
- `advanceScheduleTrackTo` (staff "play this now") sets `playlist_cursor = null`.
- Writers that don't know the column (staff play/pause, ad freeze/resume) leave it untouched.

Pure helper `lib/pair/playlist-cursor.ts`: `cursorBasis`, `upcomingFromCursor(orderedIds, basis, n)` — unit-tested.

### Page: `/pair/[deviceSlug]`

Server page resolves the device (404 → friendly "screen not found"; no room → "not set up yet"), room, branch name, source, initial state; renders `PairExperience`.

- **Pair step** (first visit only): "Pair with **Bar TV** · Java House, Thika", name field (account name if signed in, else chosen name stored in a `tz_pair_name` cookie, 1–24 chars), **Pair** button. Server action `pairWithDevice` sets the guest id cookie + name cookie.
- **Live mirror card**: artwork/title/artist, progress bar computed from payload (`positionMs + elapsed`) and `tracks.duration_seconds`, "Requested by X" badge, schedule content (`ScheduleContentDisplay`) or airing ad over the card.
- **Listen on my phone** toggle: loads YouTube player on tap and applies the zone-experience drift/seek logic; off by default.
- **"Here with N others"**: presence avatars on channel `pair-room:<roomId>`.
- **Reactions**: `ReactionBar` + `FloatingReactions` on the same channel (kiosk renders them later).
- **Up Next**: queued requests ("You're 2nd", remove own, like) then next ~5 playlist songs, or "Then: a mix of Afrobeats, Amapiano" for genre/continuous sources.
- **Request tab**: reused `AddTrackPanel` (search) → `requestSong` action.
- **Offline banner** if no device in the room has heartbeated recently; requests still allowed.

State freshness: realtime on the current source's playback row (track/content/ad changes → refetch state), a `pair-room` broadcast "queue changed" ping after own mutations, and a 15s `getPairState` poll that also detects source changes (schedule starting/ending).

### Ads mirror

`lib/pair/venue-ad.ts` adapter: polls `GET /api/business/rooms/[roomId]/ads/current` (owned by the Advertising session) on playback-row change and every 15s; tolerates 404/absent endpoint (shows no ad). Only file that knows the ad shape.

### Dashboard entry point

Screens & Devices detail panel: "Guest pairing" block with QR (same `api.qrserver.com` approach as `BranchShareCard`), copyable `/pair/<slug>` link, open-in-new-tab.

### Deferred until the Advertising session releases `kiosk-room-player.tsx`

- `components/pair/pair-qr-badge.tsx` (built now, mounted later; z-index ≤ 15).
- Kiosk subscribes to `pair-room:<roomId>` (listen-only) to render reactions.
- "Requested by X" credit on the TV.

## Out of scope

Staff moderation of requests, per-room "allow requests" toggle, changes to `/rooms/[slug]` or `/zones/[slug]`, private per-phone playback of queued songs.

## Verification

- Unit (`node --test` via standalone `tsc`): cursor math, upcoming preview, request-limit checks, slug display helpers.
- `npx tsc --noEmit`, `npx eslint` on touched files, `npm run build`.
- After SQL is applied: Playwright — pair page renders for a real device slug; request during an active schedule plays next; playlist resumes at its cursor; limits enforced.
