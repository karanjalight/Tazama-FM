-- Content Library, business Playlists, and their zone assignments.
--
-- Content is scoped to the BUSINESS (content_items.business_id), not to one
-- location — a video uploaded once should be reusable across every branch a
-- business owns. The Content Library page lives under /branches/[id]/... as
-- a navigation convenience, but the underlying entity is business-wide; this
-- also matches Billing's "Storage 18.4 GB / 50 GB" usage metric being a
-- business-level plan quota, not a per-location one.
--
-- `content_items.purpose` distinguishes ordinary content from ad creatives.
-- Ad Library and Content Library look and behave almost identically (video/
-- image/audio, storage path, thumbnail, duration, dimensions) — rather than
-- a near-duplicate `creatives` table, one row can serve either a Schedule
-- session's content layer or a Campaign's creative, filtered by `purpose`.
--
-- Playlists reuse the existing shared `tracks` catalog (public.tracks —
-- youtube_id/title/artist/genre/thumbnail, already used by rooms/likes/the
-- consumer playlists table) instead of duplicating a song entity — a
-- business playlist is just an ordered list of track references.
--
-- Run after business-locations.sql, business-audio-zones.sql.

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null,
  content_type text not null check (content_type in ('video', 'image', 'audio', 'document')),
  purpose text not null default 'content' check (purpose in ('content', 'ad_creative')),
  format text,
  storage_path text not null,
  thumbnail_path text,
  duration_seconds integer,
  size_bytes bigint not null default 0,
  resolution text,
  tag text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  uploaded_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists content_items_business_idx on public.content_items(business_id, created_at desc);
create index if not exists content_items_purpose_idx on public.content_items(business_id, purpose);

create table if not exists public.business_playlists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  description text,
  cover_path text,
  status text not null default 'active' check (status in ('active', 'draft')),
  created_at timestamptz not null default now()
);

create index if not exists business_playlists_business_idx on public.business_playlists(business_id);

create table if not exists public.business_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.business_playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, track_id)
);

create index if not exists business_playlist_tracks_playlist_idx on public.business_playlist_tracks(playlist_id, position);

-- "Playing In" — which zones currently list this playlist (distinct from a
-- zone's/audio zone's single *default* playlist, which is a direct FK below).
create table if not exists public.business_playlist_zones (
  playlist_id uuid not null references public.business_playlists(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (playlist_id, zone_id)
);

-- Now that business_playlists exists, wire the "default playlist" FKs that
-- zones/audio_zones deliberately left off in their own files.
alter table public.zones
  add column if not exists default_playlist_id uuid references public.business_playlists(id) on delete set null;

alter table public.audio_zones drop constraint if exists audio_zones_default_playlist_fk;
alter table public.audio_zones
  add constraint audio_zones_default_playlist_fk
    foreign key (default_playlist_id) references public.business_playlists(id) on delete set null;

-- ── RLS ──
alter table public.content_items enable row level security;
alter table public.business_playlists enable row level security;
alter table public.business_playlist_tracks enable row level security;
alter table public.business_playlist_zones enable row level security;

drop policy if exists "content_items_select" on public.content_items;
create policy content_items_select on public.content_items
  for select
  using (public.is_business_member(content_items.business_id, auth.uid()));

drop policy if exists "business_playlists_select" on public.business_playlists;
create policy business_playlists_select on public.business_playlists
  for select
  using (public.is_business_member(business_playlists.business_id, auth.uid()));

drop policy if exists "business_playlist_tracks_select" on public.business_playlist_tracks;
create policy business_playlist_tracks_select on public.business_playlist_tracks
  for select
  using (public.is_business_member(
    (select business_id from public.business_playlists where id = business_playlist_tracks.playlist_id),
    auth.uid()
  ));

drop policy if exists "business_playlist_zones_select" on public.business_playlist_zones;
create policy business_playlist_zones_select on public.business_playlist_zones
  for select
  using (public.is_business_member(
    (select business_id from public.business_playlists where id = business_playlist_zones.playlist_id),
    auth.uid()
  ));
