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

**"Infinite" scroll, revised during planning**: `PLAYLIST_TEMPLATES` is a fixed
list of ~15 templates — there is no way to fetch a genuinely fresh batch the
server hasn't already shown; a re-shuffled `getDiscovery()` call returns the
same template `id`s every time, so deduping by `id` against a re-fetch would
always yield zero new items. A seamless modulo wraparound (scroll position N
silently maps back to card N-mod-count) needs CSS-scroll-snap content
duplication tricks to avoid a visible jump — disproportionate for a ~12-15
item pool. v1 instead appends one synthetic **end-of-feed card** after the
real mixes: "You've hit today's mixes — tap to start over," which calls
`scrollTo({ top: 0, behavior: "smooth" })` on tap. Each fresh page load of
`/dashboard/discover` still gets a newly shuffled order/track-selection from
`getDiscovery()`. No new API route.

## Playback integration

There is exactly one persistent `YT.Player` iframe app-wide
([tazama-player-architecture](internal memory)) that must never be reparented.
The feed cannot spin up per-card video elements — it has to drive that same
iframe through a new **preview mode** on `PlayerProvider`:

- `enterPreview()` — called on mounting `/dashboard/discover`, and again
  immediately after every `commitPreview()` (so continued swiping after
  committing stays in preview mode, now snapshotted on the just-committed
  track). Snapshots `{ track, positionMs, isPlaying, isMuted }` of whatever's
  currently loaded (`null` if nothing was playing), and force-mutes. Note
  `currentTrack`/`queue`/`order`/`orderPos` are never touched by preview
  mode at all — only the raw iframe (video/position/mute) moves — so there's
  nothing else to snapshot or restore.
- `previewTrack(tracks)` — called when a card "settles" (see below), passed
  that mix's full track list. Muted-loads `tracks[0]` via the existing
  `loadVideoById` plumbing; on a fatal per-video error it tries the next track
  in the same list rather than touching the real queue.
- `commitPreview(tracks)` — called on tap. Unmutes and calls the existing
  `play(tracks[0], tracks)` (identical semantics to `PlaylistCard`'s onClick
  elsewhere in the app) — this mix becomes the real queue and now-playing
  state, persists after the user navigates away from `/dashboard/discover`.
- `exitPreview()` — called on close (if the user never committed again after
  a prior commit). Restores the snapshot from `enterPreview` (video, position,
  play state, mute state), or returns to idle/silent if there was nothing to
  restore.

**Why this needs a new flag, not the existing `isExpanded`/`videoMode`
fullscreen mode**: `isExpanded` already means "show the real now-playing
fullscreen view," which renders `FullscreenPlayer`'s own transport chrome
(scrubber, skip, etc.) — that would visually fight the feed's own card UI.
`PlayerStage` gets a new `isPreviewing` flag on the context: the video layer
becomes visible when `isExpanded || isPreviewing`, but `FullscreenPlayer`
chrome stays gated on `isExpanded` alone. The feed's own card content renders
in its own component at a higher z-index than the (z-50) stage, directly
above the never-reparented iframe — not by moving it.

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
  card, plus the trailing end-of-feed card), tracks the active index, and
  debounces settle → `previewTrack`.
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
