-- AI-assisted business playlists: genre preferences + playback mode on a
-- playlist, a hidden "mix pool" of fresh songs for continuous playback, and
-- a usage log for the per-business daily AI generation cap.
--
-- Idempotent. Run after business-content.sql (paste into the Supabase SQL
-- editor — nothing auto-applies it). Every reader in the app tolerates this
-- file not being applied yet (missing columns read as repeat mode / no
-- genres), so it's safe to deploy the code first.

-- ── Playlist settings ──
alter table public.business_playlists
  add column if not exists genres text[] not null default '{}';

alter table public.business_playlists
  add column if not exists playback_mode text not null default 'repeat';

alter table public.business_playlists drop constraint if exists business_playlists_playback_mode_check;
alter table public.business_playlists
  add constraint business_playlists_playback_mode_check
    check (playback_mode in ('repeat', 'continuous'));

-- When the mix pool was last topped up from genres / from AI. Also used as a
-- best-effort lock: a refill stamps these first so two kiosks advancing at
-- the same moment don't both refill.
alter table public.business_playlists
  add column if not exists mix_genre_refreshed_at timestamptz;
alter table public.business_playlists
  add column if not exists mix_ai_refreshed_at timestamptz;

-- ── Least-recently-played tracking for saved songs ──
alter table public.business_playlist_tracks
  add column if not exists last_played_at timestamptz;

-- ── Mix pool: fresh songs a continuous playlist blends in ──
create table if not exists public.business_playlist_mix (
  playlist_id uuid not null references public.business_playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  source text not null check (source in ('genre', 'ai')),
  last_played_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create index if not exists business_playlist_mix_playlist_idx
  on public.business_playlist_mix(playlist_id, source, last_played_at);

-- ── AI usage log (daily cap) ──
create table if not exists public.business_ai_generations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'songs',
  created_at timestamptz not null default now()
);

create index if not exists business_ai_generations_business_idx
  on public.business_ai_generations(business_id, created_at desc);

-- ── RLS (select-only, same posture as the rest of the business schema;
-- all writes go through the service-role client) ──
alter table public.business_playlist_mix enable row level security;
alter table public.business_ai_generations enable row level security;

drop policy if exists "business_playlist_mix_select" on public.business_playlist_mix;
create policy business_playlist_mix_select on public.business_playlist_mix
  for select
  using (public.is_business_member(
    (select business_id from public.business_playlists where id = business_playlist_mix.playlist_id),
    auth.uid()
  ));

drop policy if exists "business_ai_generations_select" on public.business_ai_generations;
create policy business_ai_generations_select on public.business_ai_generations
  for select
  using (public.is_business_member(business_ai_generations.business_id, auth.uid()));
