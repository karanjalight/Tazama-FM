# Discover Live

## Context

Follow-on to the TikTok-style discovery feed at `/dashboard/discover`
([2026-08-17-discovery-feed-design.md](2026-08-17-discovery-feed-design.md)),
which currently only surfaces curated playlist mixes. This adds a second,
switchable mode for discovering **live rooms** — the third idea from the
original brainstorm ("users can have fun with the live part especially on
mobile"), scoped down here to specifically: browse currently-live public
rooms in the same swipeable surface, not a broader redesign of the room
experience itself.

## Key constraint that shapes this design

Rooms play through a **separate `YT.Player` instance**
(`lib/rooms/use-youtube.ts`), entirely independent of the shared,
never-reparented iframe the mix feed's muted preview relies on
(`components/player/player-provider.tsx` — see
[[tazama-player-architecture]]). Standing up a second concurrent YouTube
player just for a swipe-preview is real added complexity and risk (two
live iframes, no shared infra to coordinate them) for a feature that today
has **no pre-join preview at all** — the room Lobby
(`components/rooms/room-experience.tsx`) shows only name, `about` text, and
listener count before a user taps "Join the hangout." Decision (confirmed
with the user): live cards get **no audio/video preview**. They're a
static, information-rich card — cover art, live badge, now-playing text,
listener count, genre chips — and tapping one navigates to `/rooms/[slug]`,
landing on the existing Lobby exactly as it does today from anywhere else
in the app.

## Mode switch

A small segmented toggle ("Mixes" / "Live"), centered at the top of the
discover feed at the same safe-area-inset-top row as the existing close
button (which stays top-right). Switching modes is pure client state — the
route stays `/dashboard/discover`, so the bottom-nav FAB doesn't change.

Switching to Live **unmounts** the mix feed. This is deliberate, not an
oversight: `DiscoverFeed`'s mount/unmount effect is what calls
`enterPreview()`/`exitPreview()` — unmounting it on a mode switch correctly
tears down any in-flight preview exactly like closing discover entirely
does today (a committed track keeps playing normally in the background; an
uncommitted preview restores to whatever was playing before). Switching
back to Mixes remounts fresh — scroll position and the previewed card reset
to the top. Not preserving mixes-feed scroll position across a mode switch
is an explicit v1 simplification (YAGNI): the alternative (keeping both
feeds mounted, one hidden) adds real state-management cost for a
low-stakes UX nuance.

## Data

`getLivePublicRooms(viewer.id)` (`lib/rooms/queries.ts`, existing —
already used by `/dashboard/live`, already excludes the viewer's own
hosted room) is fetched server-side in `app/dashboard/discover/page.tsx`
alongside the existing `getDiscovery()` call, passed to the client shell.

**Refresh, not loop.** Live rooms start and stop while a user is browsing —
unlike the mix feed's fixed template pool, looping back to the top would
show a potentially-stale list. The live feed's trailing card instead reads
"That's everyone live right now" with a **Refresh** action. Refreshing
needs a client-triggered re-fetch, so this adds one small new route,
`GET /api/rooms/live`, wrapping `getLivePublicRooms(viewer.id)` behind the
same auth pattern as the app's other track/room API routes (e.g.
`/api/rooms/search`) — confirm the exact auth/session-client convention
during planning by reading a sibling route.

## Cards

A new `DiscoverLiveCard`, full-screen (`h-dvh`, matching the mix feed's
`DiscoverCard` shape — not the existing small-tile `LiveRoomCard`, wrong
proportions for a full-bleed swipe card), built from `LiveRoomCard`'s
already-established visual vocabulary
(`components/rooms/live-room-card.tsx`): cover art from
`room.nowPlaying?.thumbnailUrl`, the pulsing "Live" badge, an `Equalizer` +
now-playing title/artist, host name, up to 3 genre chips
(`roomGenreLabel`), listener count (`formatCount`). No settle-debounce or
preview-trigger logic is needed here at all (no player call to gate) — the
live feed is plain CSS scroll-snap over a static list, simpler than the
mix feed's `DiscoverFeed`.

## Empty state

Zero live rooms currently: a distinct empty state (not the mix feed's "no
mixes yet" copy) — "No one's live right now" with a CTA into room creation
(`CreateRoomButton`/`CreateRoomCard`, "be the first"), mirroring
`/dashboard/live`'s existing empty state.

## Shared cleanup while touching this area

The close button (top-right X, safe-area-aware, `router.back()` with the
`history.length > 2` PWA-deep-link fallback) is currently duplicated
between `DiscoverFeed` and `DiscoverEmptyState` (flagged as a Minor finding
during the mix feed's final review, not fixed then). Adding a live feed and
a live empty state would make this four near-identical copies. In scope
here: extract a shared `DiscoverCloseButton` component and use it in all
four places.

## Non-goals (v1)

- No audio/video preview for live rooms (see constraint above).
- No changes to the room join flow, Lobby, or `RoomStage` — discover only
  links into the existing `/rooms/[slug]` route.
- No changes to `/dashboard/live` (the existing non-swipe live-rooms page)
  — it continues to exist unchanged as a separate surface.
- No persisting mixes-feed scroll position across a mode switch (see
  above).
