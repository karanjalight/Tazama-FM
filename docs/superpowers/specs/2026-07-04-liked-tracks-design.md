# Liked Tracks / Liked Songs — Design

Date: 2026-07-04
Status: Approved, building

## Goal
Let signed-in users like/favorite any track from anywhere in the app — cards,
lists, the player (mini bar + fullscreen), chat concierge results, and songs
playing in **live rooms**. Liked songs appear on a dedicated **Liked Songs**
page, surfaced from both **Library** and **Playlists** (a system playlist).

## Key insight
There is no single `Track` shape. The only identity shared by the catalog
`Track`, the player `PlayerTrack`, the live-room `RoomTrack` (which has **no
`id`**), and the chat `ChatTrack` (`videoId`) is the **YouTube id**. Likes are
therefore keyed by `youtubeId` (`video_id`) with denormalized title/artist/
thumbnail, mirroring how `playlist_tracks` stores denormalized data.

## 1. Data model — `public.liked_tracks`
Mirrors the `playlists`/`playlist_tracks` RLS convention (see `supabase/ai.sql`).

```sql
create table if not exists public.liked_tracks (
  user_id       uuid not null references auth.users (id) on delete cascade,
  video_id      text not null,
  title         text not null,
  artist        text,
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists liked_tracks_user_idx
  on public.liked_tracks (user_id, created_at desc);
alter table public.liked_tracks enable row level security;
-- policies: select/insert/delete where auth.uid() = user_id
```

Idempotent: PK `(user_id, video_id)` → double-like is a no-op, unlike-of-absent
is a no-op. Newest-liked first (`created_at desc`).

## 2. Server layer
- `lib/likes/store.ts` — **SERVER ONLY**, `createAdminClient()`, explicit
  `userId`, ownership enforced in code (matches `lib/playlists/store.ts`):
  - `listLikes(userId): LikedTrack[]`
  - `listLikedIds(userId): string[]` — video_ids only, seeds the client provider
  - `like(userId, track)` — upsert ignore-duplicate
  - `unlike(userId, videoId)`
- `app/dashboard/likes/actions.ts` — `"use server"`; `likeTrack(track)` /
  `unlikeTrack(videoId)` re-auth via `getCurrentProfile()`, return `{ ok }`,
  delegate to store with `profile.id` (matches `playlists/actions.ts`).

Types in `lib/likes/types.ts`: `LikedTrack { videoId, title, artist, thumbnailUrl, createdAt }`,
`LikeInput { videoId, title, artist, thumbnailUrl }`. Cover derived via existing `ytThumb()`.

## 3. Client state — global heart reactivity
- `components/likes/likes-provider.tsx` — holds `Set<string>` of liked video ids,
  seeded server-side with `initialLikedIds`. `useLikes()` → `{ isLiked(id), toggle(track), pending }`.
  `toggle` = optimistic Set update + server action; rollback + toast on failure
  (mirrors `playlist-editor` optimistic pattern).
- `components/likes/like-button.tsx` — reusable `<LikeButton track={LikeInput} size? tone? />`,
  filled heart when liked. Normalizer accepts catalog/player/room/chat shapes.
- **Two mount points** (separate route trees), each seeded from the server:
  1. `app/dashboard/layout.tsx` — covers dashboard cards + player.
  2. `app/rooms/[slug]/page.tsx` — wraps `RoomExperience` for live rooms.
  When `getCurrentProfile()` is null, seed is empty and `LikeButton` renders hidden/disabled.

## 4. Heart placements (signed-in only)
- Cards/rows: `components/dashboard/track-card.tsx` (sibling overlay — the card is
  a `<button>`), `components/artists/track-row.tsx` (finish existing placeholder at ~:88),
  `components/chat/track-card.tsx`.
- Player: `components/dashboard/now-playing-bar.tsx`,
  `components/player/now-playing-panel.tsx` (empty right slot ~:98),
  `components/player/fullscreen-player.tsx` — all off `usePlayer().currentTrack`.
- Live: `components/live/now-playing-card.tsx` controls row (room's `RoomTrack`).
- Excluded: kiosk `/player/[slug]`, landing/marketing cards (no user).

## 5. Liked Songs destinations
- `app/dashboard/liked/page.tsx` — server component; `listLikes(profile.id)`;
  header + **Play all** (loads liked tracks into the player queue) + list, each
  row with a heart (unlike removes live). Redirect to `/login` if no profile.
- Library (`app/dashboard/library/page.tsx`) — "Liked Songs" heart cover-tile →
  `/dashboard/liked`, above `RecentlyPlayed`.
- Playlists (`app/dashboard/playlists/page.tsx`) — pinned heart-tile prepended to
  the grid → `/dashboard/liked` (system playlist).
- No new top-level sidebar nav item (reachable from Library + Playlists).

## 6. Edge cases
- Demo sessions: likes write via admin store (ownership in code), consistent with
  playlists.
- `TrackCard` heart is an absolutely-positioned sibling, never nested in the button.
- Verify with `npm run build` + `npm run lint` before claiming done.
