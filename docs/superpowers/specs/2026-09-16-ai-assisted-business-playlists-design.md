# AI-Assisted Business Playlists & Schedule Sessions

## Goal

Make building background music for a business fast and non-repetitive:

1. **Continuous playlists** — a business playlist can carry genre preferences
   and a playback mode. `repeat` (default) loops the saved songs as today.
   `continuous` never audibly loops: it plays the saved songs, fresh songs from
   the playlist's genres, and AI-picked songs that complement the saved songs.
2. **"Generate with AI"** — describe what you want ("chill Afro-house for a
   Sunday brunch"), pick a length, review the suggested songs, add the ones you
   keep. Available on a playlist, when creating a playlist, and in a Schedule
   session's playlist builder.
3. **Fill the session window** — in a Schedule session the AI target defaults
   to the session's unfilled time, so the songs' real total length covers the
   window (overshoot ≤ one song).

## Decisions (with the user)

- Continuous mode = saved + genre + AI-complement songs, no looping.
- AI flow = describe → review (untick) → add.
- Schedule sessions: AI fills the session window by real duration.
- Access: any business viewer, capped at 30 AI generations per business per
  rolling 24h. Not behind the consumer `premium_access` add-on (same stance as
  AI Vibe Setup).

## Data (`supabase/business-playlist-ai.sql`, pasted by hand)

- `business_playlists`: `genres text[] default '{}'`,
  `playback_mode text default 'repeat' check in ('repeat','continuous')`,
  `mix_genre_refreshed_at timestamptz`, `mix_ai_refreshed_at timestamptz`.
- `business_playlist_tracks.last_played_at timestamptz`.
- `business_playlist_mix` (`playlist_id`, `track_id`, `source 'genre'|'ai'`,
  `last_played_at`, `added_at`, PK `(playlist_id, track_id)`) — the hidden
  fresh-song pool. Select-only RLS via `is_business_member`, like its parent.
- `business_ai_generations` (`id`, `business_id`, `user_id`, `kind`,
  `created_at`) — usage log for the daily cap.

All readers tolerate the migration not being applied yet (missing columns →
`repeat`, empty genres), so nothing breaks before the SQL is run.

## Units

| Unit | Kind | Purpose |
|---|---|---|
| `lib/business/ai-songs.ts` | pure | Groq prompt builders, completion parser, `assembleSongs` (count/duration fill, AI selected first then spread evenly), `pickCatalogMatch` |
| `lib/business/playlist-mix.ts` | pure | `chooseMixSource`, `pickLeastRecentlyPlayed`, `mixRefillNeeds` |
| `lib/business/ai-song-generator.ts` | server | Groq call → `resolveTrack` → `upsertTracksFromYouTube` → genre top-up → `assembleSongs` |
| `lib/business/playlist-mix-pool.ts` | server | `refillPlaylistMix` (genre + AI refills, lock via refreshed-at stamp), `recordPlaylistPlay` |
| `lib/business/playlist-resolver.ts` | server | `resolveNextPlaylistTrack` gains continuous mode; repeat path unchanged |
| `app/business/ai-songs/actions.ts` | action | `generateBusinessSongs` — auth, validation, daily cap, returns reviewable songs |
| `components/business/ai-songs/ai-songs-dialog.tsx` | UI | compose → loading → review dialog, shared by all three entry points |
| `components/business/genre-chip-picker.tsx` | UI | genre chips + search, extracted from the schedule builder |

## Continuous resolution

1. Load playlist mode/genres, saved rows (with `last_played_at`), pool rows.
2. Current track's source = saved / genre / ai / unknown (by youtubeId).
3. `chooseMixSource`: after a fresh (genre/ai) song → saved if any saved;
   otherwise weighted 50% saved / 25% genre / 25% ai over the non-empty
   sources.
4. `pickLeastRecentlyPlayed` within that source: never-played first (saved in
   position order), then oldest `last_played_at`; never the current track.
5. Nothing resolvable → fall back to the repeat path.
6. After the playback write succeeds, the caller calls `recordPlaylistPlay`
   (stamps `last_played_at` on the saved row or pool row).
7. `mixRefillNeeds` decides refills, run in `after()` so a song change is never
   delayed:
   - genre: genres set, < 10 genre pool songs unplayed in 24h, last genre
     refill > 2h ago.
   - ai: saved songs or genres exist, < 5 AI pool songs unplayed in 24h, last
     AI refill > 24h ago (each AI refill costs ~15 YouTube searches).
   - pool capped at 200 rows; refills skip at the cap.
   - Switching a playlist to `continuous` runs a refill immediately.

Call sites: `advanceZonePlayback` (synchronized zones) and
`/api/business/branches/advance` (plain branches) — both already route through
`resolveNextPlaylistTrack`.

## Generator

Input: prompt, genres, seed tracks (title/artist of songs already in the list),
exclude youtubeIds, target `{kind:'count'}` or `{kind:'duration', seconds}`,
mode `ai` | `genres`.

- `ai` mode asks Groq (`openai/gpt-oss-120b`, JSON mode, reasoning effort
  medium, temperature 0.6, 30s timeout) for up to 25 named songs plus up to 3
  catalog genres when none were given. Measured live: 25 songs in ~5s; low
  effort invented songs and skipped genres, so medium it is.
- Each named song is matched against the shared `tracks` catalog first
  (`pickCatalogMatch`: core title as whole words + lead artist in channel or
  title — free), and only misses go through the cached `resolveTrack`
  (a YouTube search, ~100 of the app-wide 10k daily quota units), then
  `upsertTracksFromYouTube` (real ids + durations).
- Genre top-up: `ensureGenreSeeded(genre, depth)` (depth ≤ 50), shuffled,
  deduped, durations backfilled with `getTrackDurations`.
- `assembleSongs`: AI songs are selected first, genre songs top up; the
  selection is ordered so AI picks spread evenly through the list (a 4-hour
  session doesn't front-load every AI pick). Count target takes N; duration
  target accumulates known-duration songs until total ≥ target.
- Result carries `note`, `genresUsed`, `totalSeconds`, `targetSeconds`.

## UI

- **Playlist detail panel**: "Generate with AI" beside "Add Tracks"; a
  Playback section with genre chips and a Repeat / Continuous toggle (saves
  immediately). Lengths: 15 songs / 30m / 1h / 2h.
- **Create Playlist dialog**: "Build with AI" switch → after create, the new
  playlist is selected and the AI dialog opens with name + description as the
  prompt.
- **Schedule session builder**: "Generate with AI" replaces the shuffle-based
  "Generate songs"; target defaults to remaining window time; a session with no
  genres adopts the generator's genres. Songs show an "AI" badge.

## Schedule empty-session fix

`advanceScheduleTrack`: playlist enabled + no songs + genres set → random pick
from a random session genre's catalog bucket (excluding the current song)
instead of writing silence. Not `buildSuggestions(limit: 1)`: it's
deterministic, so "first song that isn't the current one" would ping-pong
between two songs.

## Errors

- Groq key missing / call fails → error in dialog + "Use genres only" (no cap
  consumed for genres-only).
- Unresolvable songs are dropped; empty result → "Couldn't find songs for that
  — try describing it differently."
- Cap reached → "Daily AI limit reached (30 per 24h)."
- Pool/refill failures are logged and fall back to repeat behaviour.

## Verification

- `node --test` for `ai-songs.ts` and `playlist-mix.ts` (standalone tsc build,
  repo convention).
- `npx tsc --noEmit`, `npx eslint` on touched files, `npm run build`.
- Browser pass needs a business login (known gap) + SQL applied.
