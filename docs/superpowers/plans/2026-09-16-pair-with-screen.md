# Pair with a Screen Implementation Plan

> Executed inline in the authoring session (user prefers approve → build, no review gates). Spec: `docs/superpowers/specs/2026-09-16-pair-with-screen-design.md`.

**Goal:** `/pair/[deviceSlug]` — guests pair their phone with a venue screen/speaker, request songs that play next without disturbing the playlist, see what's playing/showing/coming up, see who's here, react, and optionally listen in sync.

**Architecture:** One room-keyed `venue_requests` FIFO claimed (conditional update) at the top of all three advance paths (room route, synchronized zone, schedule). A best-effort `playlist_cursor` column per playback row remembers where the playlist resumes. The page mirrors the room's authoritative source over the existing realtime hooks plus a 15s state poll; ads come read-only through one adapter.

**Tech Stack:** Next.js 16 (App Router, Server Functions), Supabase (service-role client, Realtime broadcast/presence/postgres_changes), React 19, Tailwind v4, base-ui, zod v4, `node --test` via standalone `tsc`.

## Global Constraints

- Never edit `components/player/kiosk-room-player.tsx` or `lib/business/use-branch-playback.ts` (owned by the Advertising session) — import only.
- Every advance path must behave exactly as before when `supabase/business-pair-requests.sql` hasn't been applied (all new reads/writes error-tolerant, separate from the existing writes).
- Phones never call ad claim/impression endpoints.
- Limits: 3 queued requests per guest per room, 50 per room, no duplicate of a queued or now-playing song. FIFO; likes never reorder.
- Commit only explicit paths (peer sessions have uncommitted work in this checkout).
- Test command: `npx tsc <files> --outDir $SCRATCH/tz-pair-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck && node --test $SCRATCH/tz-pair-test/`

---

### Task 1: SQL migration
- Create: `supabase/business-pair-requests.sql` — `venue_requests`, `venue_request_likes` (RLS on, no policies), `playlist_cursor text` on `room_playback`/`audio_zone_playback`/`schedule_playback`, `branch_devices.slug` unique + `before insert` trigger + backfill.

### Task 2: Pure helpers + tests
- Create: `lib/pair/playlist-cursor.ts` — `cursorBasis(cursor, currentYoutubeId): string | null`, `cursorAfterAdvance({ interruptsPlaylist, basisYoutubeId }): string | null`, `upcomingIndices(length, basisIndex, count): number[]`.
- Create: `lib/pair/request-rules.ts` — `MAX_REQUESTS_PER_GUEST`, `MAX_REQUESTS_PER_ROOM`, `checkRequest(...)`, `cleanDisplayName(raw)`, `queuePositionLabel(index)`, `requestedByFor({ currentYoutubeId, lastClaim, now })`.
- Create: `lib/pair/room-track.ts` — `asRoomTrack(value: unknown): RoomTrack | null`.
- Tests: `lib/pair/playlist-cursor.test.ts`, `lib/pair/request-rules.test.ts`.

### Task 3: Server data layer
- Create: `lib/pair/types.ts` — `PairSourceKind`, `PairSource`, `PairNowPlaying`, `PairRequest`, `PairUpcoming`, `PairState`, `PairDevice`.
- Create: `lib/pair/room-source.ts` — `resolveRoomSource(roomId)`, `sourceRoomIds(admin, source)`.
- Create: `lib/pair/request-queue.ts` — `claimNextRequest(admin, roomIds)`, `releaseRequest(admin, id)`.
- Create: `lib/pair/playlist-cursor-store.ts` — `readPlaylistCursor(admin, kind, id)`, `writePlaylistCursor(admin, kind, id, cursor)`.

### Task 4: Wire into the three advance paths
- Modify: `lib/business/schedule-playback.ts` (`advanceScheduleTrack`, `advanceScheduleTrackTo`), `lib/business/audio-zone-playback.ts` (`advanceZonePlayback`), `app/api/business/branches/advance/route.ts`.
- Request claimed first; release on lost CAS/update error; playlist "next" computed from `cursorBasis`; cursor written only when it changes.

### Task 5: Pair queries, identity, actions
- Create: `lib/pair/queries.ts` — `getPairDeviceBySlug(slug)`, `readSourcePlayback(admin, source)`, `getPairState(roomId, viewerId)`.
- Create: `lib/pair/identity.ts` — `PAIR_NAME_COOKIE`, `getPairViewer()`, `resolvePairActor()`.
- Create: `app/pair/actions.ts` — `pairWithDevice(name)`, `requestSong(deviceSlug, track)`, `removeRequest(requestId)`, `toggleRequestLike(requestId)`, `fetchPairState(deviceSlug)`.

### Task 6: Client plumbing
- Modify: `lib/rooms/channel.ts` (+`pairChannelName`), `lib/business/use-zone-channel.ts` (+optional `channelName`).
- Create: `lib/pair/venue-ad.ts` (`VenueAd`, `fetchVenueAd(roomId)`), `lib/pair/use-phone-listen.ts`, `lib/pair/use-pair-live.ts`.

### Task 7: Page + UI
- Create: `app/pair/[slug]/page.tsx`, `components/pair/pair-experience.tsx`, `pair-join-card.tsx`, `now-showing-card.tsx`, `up-next-list.tsx`, `here-now-strip.tsx`, `pair-unavailable.tsx`.

### Task 8: Dashboard entry point
- Modify: `lib/business/device-queries.ts` (+`slug` on `ManagedDevice`, best-effort read), `components/business/screens-devices/detail-panel.tsx`.
- Create: `components/business/screens-devices/pair-link-card.tsx`.

### Task 9: Verification
- Unit tests, `npx tsc --noEmit`, `npx eslint` on touched files, `npm run build`, curl smoke of `/pair/<unknown>`; live Playwright pass once SQL is applied.

### Task 10 (blocked on Advertising session releasing the kiosk file)
- `components/pair/pair-qr-badge.tsx` (z ≤ 15) mounted in kiosk; kiosk listens on `pair-room:<roomId>` for reactions; "Requested by" credit on TV.
