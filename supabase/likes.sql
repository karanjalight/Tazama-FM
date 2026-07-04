-- Liked / favorite tracks — a personal, per-user library of saved songs.
--
-- Keyed by YouTube video id (the only identity shared by every track shape in
-- the app: catalog Track, PlayerTrack, live-room RoomTrack, and chat ChatTrack),
-- with denormalized title/artist/thumbnail so a song can be liked from anywhere
-- — including a live room, where no catalog `tracks.id` exists — and re-rendered
-- later without a catalog lookup. Mirrors the playlists RLS convention.
--
-- Run in the Supabase SQL editor (or psql) once. Safe to re-run (idempotent).

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

drop policy if exists "liked_tracks_select_own" on public.liked_tracks;
create policy "liked_tracks_select_own" on public.liked_tracks
  for select using (auth.uid() = user_id);
drop policy if exists "liked_tracks_insert_own" on public.liked_tracks;
create policy "liked_tracks_insert_own" on public.liked_tracks
  for insert with check (auth.uid() = user_id);
drop policy if exists "liked_tracks_delete_own" on public.liked_tracks;
create policy "liked_tracks_delete_own" on public.liked_tracks
  for delete using (auth.uid() = user_id);
