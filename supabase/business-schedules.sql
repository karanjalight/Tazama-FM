-- Schedules: a named, dated/recurring program made of time-blocked sessions.
-- Each session independently layers content (images/video), a playlist
-- (genre-driven or manual tracks), and ads — all three can be active in the
-- same session at once, per the create-schedule wizard.
--
-- Targeting (which locations/zones/rooms/specific screens a schedule plays
-- on) is modelled as four separate join tables rather than one polymorphic
-- `(target_type, target_id)` table — Postgres can't enforce a real foreign
-- key against a polymorphic id, and referential integrity here is worth the
-- extra tables: a schedule can never end up pointing at a deleted room.
--
-- Run after business-locations.sql, business-content.sql (needs content_items,
-- tracks for session songs).

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  tags text[] not null default '{}',
  color text,
  notes text,
  override_existing boolean not null default false,
  screen_mode text not null default 'all' check (screen_mode in ('all', 'specific')),
  start_date date not null,
  end_date date,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekdays', 'weekends', 'weekly', 'monthly', 'custom')),
  custom_days text[] not null default '{}',
  timezone text not null default 'Africa/Nairobi',
  activation text not null default 'now' check (activation in ('now', 'scheduled')),
  scheduled_start_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_business_idx on public.schedules(business_id, status);

create table if not exists public.schedule_target_locations (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (schedule_id, branch_id)
);

create table if not exists public.schedule_target_zones (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (schedule_id, zone_id)
);

create table if not exists public.schedule_target_rooms (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (schedule_id, room_id)
);

-- Only populated when schedule_mode = 'specific'.
create table if not exists public.schedule_target_screens (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  device_id uuid not null references public.branch_devices(id) on delete cascade,
  primary key (schedule_id, device_id)
);

-- ── Sessions: the day-builder's time blocks ──
create table if not exists public.schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  start_time time not null,
  end_time time not null,
  transition text not null default 'fade' check (transition in ('fade', 'cut', 'slide', 'dissolve')),

  -- content layer
  content_enabled boolean not null default true,
  content_order text not null default 'listed' check (content_order in ('listed', 'shuffle')),
  fit text not null default 'fill' check (fit in ('fill', 'fit', 'stretch')),
  background_color text,
  content_repeat text not null default 'loop' check (content_repeat in ('loop', 'once')),
  content_frequency_mode text not null default 'continuous' check (content_frequency_mode in ('continuous', 'periodic')),
  content_frequency_interval_minutes integer,

  -- playlist layer
  playlist_enabled boolean not null default false,
  genres text[] not null default '{}',
  content_playlist_interaction text not null default 'background'
    check (content_playlist_interaction in ('background', 'pause-music')),

  -- ad layer (ads always interrupt — a fixed platform rule, not configurable)
  ads_enabled boolean not null default false,
  ad_frequency text,
  ad_max_plays_per_day integer,
  ad_position text check (ad_position in ('any', 'strategic', 'end-of-playlist', 'beginning-of-playlist')),
  ad_min_spacing_enabled boolean not null default false,
  ad_min_spacing_minutes integer,
  ad_no_repeat_enabled boolean not null default false,
  ad_no_repeat_minutes integer,
  respect_offline_time boolean not null default true
);

create index if not exists schedule_sessions_schedule_idx on public.schedule_sessions(schedule_id, position);

create table if not exists public.schedule_session_content (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.schedule_sessions(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  position integer not null default 0
);

create index if not exists schedule_session_content_session_idx on public.schedule_session_content(session_id, position);

-- Ads reuse content_items too (purpose = 'ad_creative'), kept as a separate
-- junction rather than a shared one so a schedule's content and ad layers
-- can be reordered/edited independently even though both point at content_items.
create table if not exists public.schedule_session_ads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.schedule_sessions(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  position integer not null default 0
);

create index if not exists schedule_session_ads_session_idx on public.schedule_session_ads(session_id, position);

-- Manually-picked songs only. "AI" mode has no discrete rows — it plays from
-- schedule_sessions.genres at render time, so there's nothing to store per song.
create table if not exists public.schedule_session_songs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.schedule_sessions(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null default 0
);

create index if not exists schedule_session_songs_session_idx on public.schedule_session_songs(session_id, position);

-- ── RLS (select-only, same posture as the rest of the business schema) ──
alter table public.schedules enable row level security;
alter table public.schedule_target_locations enable row level security;
alter table public.schedule_target_zones enable row level security;
alter table public.schedule_target_rooms enable row level security;
alter table public.schedule_target_screens enable row level security;
alter table public.schedule_sessions enable row level security;
alter table public.schedule_session_content enable row level security;
alter table public.schedule_session_ads enable row level security;
alter table public.schedule_session_songs enable row level security;

drop policy if exists "schedules_select" on public.schedules;
create policy schedules_select on public.schedules
  for select
  using (public.is_business_member(schedules.business_id, auth.uid()));

drop policy if exists "schedule_target_locations_select" on public.schedule_target_locations;
create policy schedule_target_locations_select on public.schedule_target_locations
  for select
  using (exists (select 1 from public.schedules s where s.id = schedule_target_locations.schedule_id
                   and public.is_business_member(s.business_id, auth.uid())));

drop policy if exists "schedule_target_zones_select" on public.schedule_target_zones;
create policy schedule_target_zones_select on public.schedule_target_zones
  for select
  using (exists (select 1 from public.schedules s where s.id = schedule_target_zones.schedule_id
                   and public.is_business_member(s.business_id, auth.uid())));

drop policy if exists "schedule_target_rooms_select" on public.schedule_target_rooms;
create policy schedule_target_rooms_select on public.schedule_target_rooms
  for select
  using (exists (select 1 from public.schedules s where s.id = schedule_target_rooms.schedule_id
                   and public.is_business_member(s.business_id, auth.uid())));

drop policy if exists "schedule_target_screens_select" on public.schedule_target_screens;
create policy schedule_target_screens_select on public.schedule_target_screens
  for select
  using (exists (select 1 from public.schedules s where s.id = schedule_target_screens.schedule_id
                   and public.is_business_member(s.business_id, auth.uid())));

drop policy if exists "schedule_sessions_select" on public.schedule_sessions;
create policy schedule_sessions_select on public.schedule_sessions
  for select
  using (exists (select 1 from public.schedules s where s.id = schedule_sessions.schedule_id
                   and public.is_business_member(s.business_id, auth.uid())));

drop policy if exists "schedule_session_content_select" on public.schedule_session_content;
create policy schedule_session_content_select on public.schedule_session_content
  for select
  using (exists (
    select 1 from public.schedule_sessions ss
    join public.schedules s on s.id = ss.schedule_id
    where ss.id = schedule_session_content.session_id
      and public.is_business_member(s.business_id, auth.uid())
  ));

drop policy if exists "schedule_session_ads_select" on public.schedule_session_ads;
create policy schedule_session_ads_select on public.schedule_session_ads
  for select
  using (exists (
    select 1 from public.schedule_sessions ss
    join public.schedules s on s.id = ss.schedule_id
    where ss.id = schedule_session_ads.session_id
      and public.is_business_member(s.business_id, auth.uid())
  ));

drop policy if exists "schedule_session_songs_select" on public.schedule_session_songs;
create policy schedule_session_songs_select on public.schedule_session_songs
  for select
  using (exists (
    select 1 from public.schedule_sessions ss
    join public.schedules s on s.id = ss.schedule_id
    where ss.id = schedule_session_songs.session_id
      and public.is_business_member(s.business_id, auth.uid())
  ));
