# TikTok-style discovery feed

## Context

Three ideas came out of the same conversation about the mobile bottom nav
([mobile-bottom-nav.tsx](../../../components/dashboard/mobile-bottom-nav.tsx)):

1. Swap the bottom nav's `AI Chat` slot for `Library` (small, no design needed —
   `/dashboard/library` already exists and just isn't linked from the mobile bar).
2. Repurpose the center `+` (currently `CreateRoomButton`) into a TikTok-style
   vertically-swipeable feed for discovering playlists. **This spec.**
3. Make the live/rooms experience more fun on mobile. Out of scope here — separate
   spec, separate session.

This spec covers #2 only.

## Goals

- Give the `+` slot a swipe-to-discover feed of the app's existing curated mixes,
  full-screen, one mix per card, TikTok/Reels-style vertical snap scrolling.
- Preview each mix with muted autoplaying video; tapping a card commits to it as
  real playback.
- Don't lose room creation — it must remain reachable elsewhere.
- Don't fight the existing single-iframe player architecture; extend it.

## Non-goals (v1)

- No new content/curation model — reuses the existing `getDiscovery()` mixes.
- No "start a room with this vibe" bridge, no "save mix to Your Playlists" — only
  a like/heart action ships in v1 (per product decision during brainstorming).
- No desktop entry point (no FAB exists there today); the route works if visited
  directly but isn't linked from desktop nav in v1.

## Entry point

`mobile-bottom-nav.tsx`'s center `CreateRoomButton` FAB becomes a `Link` to
`/dashboard/discover`. Room creation remains reachable via:
- the hamburger drawer (`mobile-sidebar.tsx`, full `dashboardNav`)
- `/dashboard/live`'s header button and empty-state CTA
- `/dashboard/library`'s `CreateRoomCard`
- Home's `rooms-section.tsx`

So removing the FAB's create-room duty doesn't dead-end anyone.

## Data

No new content pipeline. [lib/discovery.ts](../../../lib/discovery.ts)'s
`getDiscovery()` already assembles `DiscoveryPlaylist[]` (title, subtitle, cover,
tracks) server-side from `PLAYLIST_TEMPLATES`, shuffled per call, filtered to
mixes with >=3 tracks. The feed's initial batch is exactly `getDiscovery().playlists`
(currently capped at 12).

**Infinite scroll**: a new `GET /api/discover/more` route re-runs `getDiscovery()`
server-side (fresh shuffle) and returns `playlists`. Client calls it once the user
is within 3 cards of the end of the current batch, appends any mix `id`s not
already seen this session (a `Set<string>` in the feed's client state), and loops
back to the top of the newest batch if a call returns nothing new (finite catalog
— avoids an infinite-fetch loop when everything's been seen).

## Playback integration

There is exactly one persistent `YT.Player` iframe app-wide
([tazama-player-architecture](internal memory)) that must never be reparented.
The feed cannot spin up per-card video elements — it has to drive that same
iframe through a new **preview mode** on `PlayerProvider`:

- `enterPreview()` — called once on mounting `/dashboard/discover`. Snapshots
  `{ track, positionMs, isPlaying }` of whatever's currently loaded (or `null` if
  nothing was playing).
- `previewTrack(track)` — called when a card "settles" (see below). Loads the
  track **muted** (`volume = 0`, restored on commit/exit) via the existing
  `loadVideoById` plumbing; `PlayerStage` is switched to its visible video mode,
  filling the card's background.
- `commitPreview(tracks)` — called on tap. Unmutes and calls the existing
  `play(tracks[0], tracks)` (identical semantics to `PlaylistCard`'s onClick
  elsewhere in the app) — this mix becomes the real queue and now-playing state,
  persists after the user navigates away from `/dashboard/discover`.
- `exitPreview()` — called on close (if the user never committed). Unmutes,
  restores the snapshot from `enterPreview` (or returns to idle/collapsed if
  there was nothing to restore).

**Settling / debounce**: cards trigger `previewTrack` only after the scroll-snap
container fires `scrollend` (or an equivalent debounced ~350ms settle if
`scrollend` support is inconsistent) — never on intermediate scroll positions.
This means fast swiping through several cards never issues more than one
`loadVideoById` call, avoiding hammering the YouTube API and avoiding jarring
audio/video flicker.

**Unplayable tracks**: reuses the existing `onUnplayable` → `POST
/api/tracks/unplayable` + auto-skip behavior already used by the dashboard/room
players — if a mix's lead track fails, the card auto-advances its preview to
the mix's next track rather than the whole card being skipped.

## Shell / UI

- Route: `app/dashboard/discover/page.tsx` (server component, calls
  `getDiscovery()`, passes `playlists` into a client component). Lives under
  the existing `app/dashboard/layout.tsx`, so `PlayerStage` is never remounted.
- `components/discover/discover-feed.tsx` (client): owns the
  `overflow-y-scroll snap-y snap-mandatory` container (one `h-dvh` section per
  card), tracks the active index, debounced settle → `previewTrack`, and the
  infinite-scroll fetch-more trigger.
- `components/discover/discover-card.tsx`: single card — video/cover
  background, title/subtitle, like button (existing `LikesProvider`, same heart
  used dashboard-wide), tap target to commit.
- While `/dashboard/discover` is active, `MobileBottomNav` and any top chrome
  are hidden (full-bleed immersive surface). An explicit close (`X`, top
  corner) calls `router.back()` — swipe-down is not used for dismissal since
  vertical swipe is already claimed by next/prev card navigation.

## Edge cases

- Empty catalog (`playlists.length === 0`, e.g. dev environment with no seeded
  tracks): same "no tracks yet" empty state pattern used elsewhere, with a link
  back to `/dashboard/browse`.
- User backgrounds the tab / locks the phone mid-preview: no special handling —
  the browser suspends the (already muted) video on its own.
- User taps a card while a `loadVideoById` from the previous settle is still
  in flight: `commitPreview` always operates on the currently-targeted card's
  track list, not a stale reference — guarded the same way `useYouTube`
  already guards on `readyRef.current` before calling player methods.

## Testing

- `tsc --noEmit` + `eslint` (per this repo's `next build` + dev server `.next`
  lock conflict — validated this way, not a live build, per
  [[tazama-player-architecture]]).
- Manual pass in the dev server at a mobile viewport: swipe/snap feels right,
  muted video autoplays on settle only (not on every scroll tick), tap commits
  and takes over the real now-playing bar, close restores whatever was playing
  before, like button works and shows up in `/dashboard/liked`.
