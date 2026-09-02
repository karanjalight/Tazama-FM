-- ============================================================================
-- Tazama Business MVP schema — combined apply script
-- Generated from the 9 individual files below, in their required dependency
-- order. Paste this WHOLE file into the Supabase SQL editor and run it once.
-- Safe to re-run — every statement is guarded (IF NOT EXISTS / OR REPLACE /
-- ON CONFLICT / DROP ... IF EXISTS before re-creating).
-- ============================================================================


-- ============================================================================
-- FILE: supabase/business-locations.sql
-- ============================================================================
-- Business locations: Zones + many-rooms-per-location + richer Screens/Devices.
--
-- Today, `branches` is hard 1:1 with `rooms` (branches.room_id is unique). The
-- newer business UI (the location wizard, Rooms & Zones, Screens & Devices)
-- models a location as: Location -> Zones -> Rooms (many) -> Screens (many).
-- We do NOT break the 1:1 assumption anything existing relies on — instead:
--
--   * `branches` becomes the full Location record (address/timezone/status
--     toggles), and `branches.room_id` keeps meaning "this location's
--     default/primary room" (nothing that reads it today has to change).
--   * `rooms` gains `branch_id` (nullable) so a location can own MANY rooms,
--     not just the one `branches.room_id` points to. Every business room —
--     default or not — is still a plain `rooms` row, so it rides the exact
--     same room_playback/room_queue/realtime machinery a room already has.
--   * `zones` is new: a location groups its rooms into zones (Dining, Bar,
--     Rooftop, ...), matching Rooms & Zones and the location wizard 1:1.
--   * `branch_devices` (a physical screen or speaker) gains `room_id`, so a
--     device's 4-digit pairing code resolves to a specific ROOM inside a
--     location, not just the location itself. `device_pairings` gains the
--     same `room_id` so staff can pick which room a code is being claimed
--     for at claim time.
--
-- Run after business.sql, branch-controls.sql, branch-multi-device.sql.

-- ── New RLS helper: business.sql's two existing ones don't cover what the
-- rest of this schema needs ──
--
-- `is_business_staff(business, user, branch)` correctly includes the owner
-- (`business = user`), but with no branch passed (branch = null default) a
-- MANAGER never matches — their access is intentionally branch-gated,
-- checked only when a real branch id is supplied. That's the right helper
-- for the branch-owned tables below (zones, audio_zones, devices — see
-- their own RLS sections), each called with a real branch_id.
--
-- `is_staff_of_business(business, user)` looks like a general "any staff of
-- this business" check but isn't one: it requires a `business_staff_branches`
-- row to exist, which admins never get (`getBusinessViewer()` gives admins
-- `branchIds: "all"` without any actual branch-join rows), and it doesn't
-- check ownership at all. It exists for one narrow purpose (the
-- `business_staff_select` policy's "am I an active staff member at all"
-- OR-clause) — reusing it as a general check would (and, before this fix,
-- did) lock the owner and admins out of their own business-wide data.
--
-- `is_business_member` below is the actual "owner, or any accepted staff
-- row regardless of role/branch" check the business-WIDE tables in every
-- later file need (content, playlists, schedules, announcements, campaigns,
-- billing, integrations, business settings) — things that aren't owned by
-- one branch, so branch-scoping doesn't apply to them in the first place.
create or replace function public.is_business_member(p_business uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    p_business = p_user
    or exists (
      select 1 from public.business_staff s
      where s.business_id = p_business
        and s.user_id = p_user
        and s.accepted_at is not null
    );
$$;

-- ── Locations: extend `branches` with the fields the wizard/list UI need ──
alter table public.branches
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists timezone text not null default 'Africa/Nairobi',
  add column if not exists description text,
  add column if not exists image_path text,
  add column if not exists allow_ads boolean not null default true,
  add column if not exists allow_announcements boolean not null default true,
  add column if not exists collect_engagement_data boolean not null default true,
  add column if not exists restrict_content_rating boolean not null default false;

comment on column public.branches.image_path is
  'Supabase Storage path for the location photo shown in the branches list preview panel.';

-- "Active/Offline" status is deliberately NOT a stored column here — it's
-- derived the same way the real branch detail page already computes it
-- (any branch_devices row with last_seen_at within the 90s online window).
-- Storing it would just go stale between heartbeats.

-- ── Zones: a location groups its rooms ──
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  description text,
  active_hours_start time,
  active_hours_end time,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists zones_branch_idx on public.zones(branch_id);

-- ── Rooms: let a location own many rooms, each a first-class `rooms` row ──
alter table public.rooms
  add column if not exists branch_id uuid references public.branches(id) on delete cascade,
  add column if not exists zone_id uuid references public.zones(id) on delete set null,
  add column if not exists room_type text,
  add column if not exists capacity integer,
  add column if not exists tag text,
  add column if not exists room_description text;

create index if not exists rooms_branch_idx on public.rooms(branch_id) where branch_id is not null;
create index if not exists rooms_zone_idx on public.rooms(zone_id) where zone_id is not null;

comment on column public.rooms.branch_id is
  'Set for every business room (default or additional). branches.room_id still names the location''s default room; this column is what makes "many rooms per location" possible.';
comment on column public.rooms.room_description is
  'Named to avoid colliding with rooms.about (the consumer room''s free-text blurb) — this is the wizard''s Room.description field.';

-- ── Devices: a screen/speaker pairs to a specific room, not just a branch ──
alter table public.branch_devices
  add column if not exists room_id uuid references public.rooms(id) on delete set null,
  add column if not exists device_kind text not null default 'screen' check (device_kind in ('screen', 'audio')),
  add column if not exists device_model text,
  add column if not exists hardware_id text,
  add column if not exists app_version text,
  add column if not exists ip_address text,
  add column if not exists is_primary boolean not null default false;

create index if not exists branch_devices_room_idx on public.branch_devices(room_id) where room_id is not null;

comment on column public.branch_devices.room_id is
  'The specific room this device is paired to. Nullable during the transition — a device claimed before this column existed (or claimed with no room chosen) falls back to its branch''s default room (branches.room_id) at the application layer.';

-- Pairing now optionally captures which room a code is being claimed for —
-- staff pick a room (or leave it to fall back to the location default) when
-- they redeem the code, and claimDevice() carries that choice onto the new
-- branch_devices.room_id column above.
alter table public.device_pairings
  add column if not exists claimed_room_id uuid references public.rooms(id) on delete set null;

-- ── Device telemetry: latest-snapshot health, separate from device identity ──
-- Screens & Devices' network/playback quality, temperature, storage% and
-- uptime churn on every heartbeat — keeping them off branch_devices (a
-- comparatively stable identity row) avoids rewriting that row constantly
-- and keeps the identity vs. health concerns separate. One row per device;
-- the heartbeat endpoint upserts it. A time-series of these (for real
-- historical uptime %) is deliberately out of scope here — see
-- business-analytics.sql's device_heartbeats event log for that.
create table if not exists public.device_telemetry (
  device_id uuid primary key references public.branch_devices(id) on delete cascade,
  network_quality text check (network_quality in ('excellent', 'good', 'fair', 'poor')),
  playback_quality text check (playback_quality in ('excellent', 'good', 'fair', 'poor')),
  temperature_c numeric,
  storage_percent numeric,
  uptime_seconds bigint,
  updated_at timestamptz not null default now()
);

-- ── RLS ──
-- Same posture as business.sql: only SELECT policies here. All writes
-- (create zone, create room, claim device, heartbeat) go through
-- server actions using the service-role client, same as everything else
-- in the business schema — see business.sql's own note on this.
--
-- Unlike the business-wide tables in later files (schedules, campaigns,
-- billing, ...), these are all directly owned by ONE branch — so they use
-- the branch-aware `is_business_staff(business, user, branch)` helper
-- (which respects business_staff_branches manager scoping) rather than the
-- coarser `is_business_member(business, user)` used elsewhere, so a
-- manager only sees zones/rooms/devices for branches they're assigned to.

alter table public.zones enable row level security;
alter table public.device_telemetry enable row level security;

drop policy if exists "zones_select" on public.zones;
create policy zones_select on public.zones
  for select
  using (public.is_business_staff(
    (select business_id from public.branches where id = zones.branch_id),
    auth.uid(),
    zones.branch_id
  ));

drop policy if exists "device_telemetry_select" on public.device_telemetry;
create policy device_telemetry_select on public.device_telemetry
  for select
  using (public.is_business_staff(
    (select b.business_id
       from public.branch_devices d
       join public.branches b on b.id = d.branch_id
      where d.id = device_telemetry.device_id),
    auth.uid(),
    (select branch_id from public.branch_devices where id = device_telemetry.device_id)
  ));


-- ============================================================================
-- FILE: supabase/business-audio-zones.sql
-- ============================================================================
-- Audio Zones: a named background-audio playback configuration that covers
-- one or more rooms. This is deliberately NOT the same thing as a `zones`
-- row (a physical area like "Bar" or "Dining") — an AudioZone is a playback
-- config (volume limit, crossfade, ducking) that can span rooms across
-- different physical zones, and a physical zone can be covered by more than
-- one AudioZone. The actual speaker hardware is just a `branch_devices` row
-- with device_kind = 'audio' sitting in one of the covered rooms — no
-- separate "Speaker" table, to avoid a redundant device identity.
--
-- Run after business-locations.sql (needs zones, rooms, branch_devices).

create table if not exists public.audio_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  volume smallint not null default 60 check (volume between 0 and 100),
  volume_limit smallint not null default 100 check (volume_limit between 0 and 100),
  crossfade_seconds smallint not null default 3,
  audio_ducking_enabled boolean not null default true,
  announcements_enabled boolean not null default true,
  default_playlist_id uuid, -- FK added in business-content.sql once business_playlists exists
  schedule_start time,
  schedule_end time,
  created_at timestamptz not null default now()
);

create index if not exists audio_zones_branch_idx on public.audio_zones(branch_id);
create index if not exists audio_zones_zone_idx on public.audio_zones(zone_id) where zone_id is not null;

comment on column public.audio_zones.zone_id is
  'Optional — the physical zone this audio zone is primarily associated with, for display (e.g. "Zone: Bar Area"). Actual coverage is audio_zone_rooms, which can span zones.';

-- Coverage: which rooms this audio zone plays into (matches the wizard's
-- AudioZone.roomIds[] many-to-many; the richer Audio Zones page's single
-- "zoneName" is just this audio zone's zone_id above for display).
create table if not exists public.audio_zone_rooms (
  audio_zone_id uuid not null references public.audio_zones(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (audio_zone_id, room_id)
);

create index if not exists audio_zone_rooms_room_idx on public.audio_zone_rooms(room_id);

-- ── RLS ──
-- Branch-owned (see business-locations.sql's note) — branch-aware
-- is_business_staff(), so manager branch-scoping applies here too.
alter table public.audio_zones enable row level security;
alter table public.audio_zone_rooms enable row level security;

drop policy if exists "audio_zones_select" on public.audio_zones;
create policy audio_zones_select on public.audio_zones
  for select
  using (public.is_business_staff(
    (select business_id from public.branches where id = audio_zones.branch_id),
    auth.uid(),
    audio_zones.branch_id
  ));

drop policy if exists "audio_zone_rooms_select" on public.audio_zone_rooms;
create policy audio_zone_rooms_select on public.audio_zone_rooms
  for select
  using (public.is_business_staff(
    (select b.business_id
       from public.audio_zones az
       join public.branches b on b.id = az.branch_id
      where az.id = audio_zone_rooms.audio_zone_id),
    auth.uid(),
    (select az.branch_id from public.audio_zones az where az.id = audio_zone_rooms.audio_zone_id)
  ));


-- ============================================================================
-- FILE: supabase/business-content.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: supabase/business-schedules.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: supabase/business-announcements.sql
-- ============================================================================
-- Announcements: a recorded voice-over blast to a set of locations/zones/
-- rooms/audio zones. Recording is already real on the client (getUserMedia +
-- MediaRecorder) — this is the first business feature where the raw
-- audio_path is a genuine Storage upload, not a mock.
--
-- Run after business-locations.sql, business-audio-zones.sql.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null,
  category text not null default 'general'
    check (category in ('promotion', 'operational', 'event', 'customer_service', 'emergency', 'general')),
  description text,
  audio_path text,
  duration_seconds integer,
  playback_mode text not null default 'reduce' check (playback_mode in ('pause', 'reduce')),
  reduced_volume_percent smallint check (reduced_volume_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent')),
  repeat text not null default 'none'
    check (repeat in ('none', 'daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_business_idx on public.announcements(business_id, status);

create table if not exists public.announcement_target_locations (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (announcement_id, branch_id)
);

create table if not exists public.announcement_target_zones (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (announcement_id, zone_id)
);

create table if not exists public.announcement_target_rooms (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (announcement_id, room_id)
);

create table if not exists public.announcement_target_audio_zones (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  audio_zone_id uuid not null references public.audio_zones(id) on delete cascade,
  primary key (announcement_id, audio_zone_id)
);

-- Per-device delivery confirmation — also doubles as the raw event log the
-- Announcements dashboard's "Sent Today" / "deliveredPct" stats aggregate over.
create table if not exists public.announcement_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  device_id uuid not null references public.branch_devices(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  playback_mode_applied text check (playback_mode_applied in ('pause', 'reduce'))
);

create index if not exists announcement_deliveries_announcement_idx on public.announcement_deliveries(announcement_id);
create index if not exists announcement_deliveries_device_idx on public.announcement_deliveries(device_id, delivered_at desc);

-- ── RLS ──
alter table public.announcements enable row level security;
alter table public.announcement_target_locations enable row level security;
alter table public.announcement_target_zones enable row level security;
alter table public.announcement_target_rooms enable row level security;
alter table public.announcement_target_audio_zones enable row level security;
alter table public.announcement_deliveries enable row level security;

drop policy if exists "announcements_select" on public.announcements;
create policy announcements_select on public.announcements
  for select
  using (public.is_business_member(announcements.business_id, auth.uid()));

drop policy if exists "announcement_target_locations_select" on public.announcement_target_locations;
create policy announcement_target_locations_select on public.announcement_target_locations
  for select
  using (exists (select 1 from public.announcements a where a.id = announcement_target_locations.announcement_id
                   and public.is_business_member(a.business_id, auth.uid())));

drop policy if exists "announcement_target_zones_select" on public.announcement_target_zones;
create policy announcement_target_zones_select on public.announcement_target_zones
  for select
  using (exists (select 1 from public.announcements a where a.id = announcement_target_zones.announcement_id
                   and public.is_business_member(a.business_id, auth.uid())));

drop policy if exists "announcement_target_rooms_select" on public.announcement_target_rooms;
create policy announcement_target_rooms_select on public.announcement_target_rooms
  for select
  using (exists (select 1 from public.announcements a where a.id = announcement_target_rooms.announcement_id
                   and public.is_business_member(a.business_id, auth.uid())));

drop policy if exists "announcement_target_audio_zones_select" on public.announcement_target_audio_zones;
create policy announcement_target_audio_zones_select on public.announcement_target_audio_zones
  for select
  using (exists (select 1 from public.announcements a where a.id = announcement_target_audio_zones.announcement_id
                   and public.is_business_member(a.business_id, auth.uid())));

drop policy if exists "announcement_deliveries_select" on public.announcement_deliveries;
create policy announcement_deliveries_select on public.announcement_deliveries
  for select
  using (exists (select 1 from public.announcements a where a.id = announcement_deliveries.announcement_id
                   and public.is_business_member(a.business_id, auth.uid())));


-- ============================================================================
-- FILE: supabase/business-analytics.sql
-- ============================================================================
-- Analytics event log. Every number on the Dashboard/Analytics/Audience/
-- Reports pages today is a scripted mock — nothing persists a raw event.
-- Rather than storing pre-computed aggregates (which go stale the moment
-- anything changes), this file adds two append-only event tables that
-- dashboards SELECT ... GROUP BY over at query time:
--
--   * device_heartbeats — one row per heartbeat, so "Screen Uptime %" and
--     historical network/playback quality can be computed over any date
--     range (device_telemetry in business-locations.sql only holds the
--     LATEST snapshot — fine for "is this screen online right now", useless
--     for "what was uptime last week").
--   * content_play_events — one row per content/ad/track play, the single
--     source both "Content Plays"/"Top Content" and "Ad Plays"/campaign
--     performance aggregate over (filtered by play_kind).
--
-- Audience reach/"who's here right now" does NOT need a new table — it's
-- already covered by the existing room_presence table (business.sql /
-- branch-multi-device.sql), which is exactly a presence event log keyed by
-- room_id. Audience heatmaps/peak-hours can be derived from it directly.
--
-- These are high-volume, insert-only tables. Retention/rollup (e.g. a
-- nightly job that compacts events older than N days into a daily summary
-- table) is a follow-up concern, not designed here — call it out before
-- this ships to real device traffic.
--
-- Run after business-locations.sql, business-content.sql, business-schedules.sql.

create table if not exists public.device_heartbeats (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.branch_devices(id) on delete cascade,
  at timestamptz not null default now(),
  status text not null default 'online' check (status in ('online', 'offline')),
  network_quality text check (network_quality in ('excellent', 'good', 'fair', 'poor')),
  playback_quality text check (playback_quality in ('excellent', 'good', 'fair', 'poor')),
  temperature_c numeric,
  storage_percent numeric
);

create index if not exists device_heartbeats_device_idx on public.device_heartbeats(device_id, at desc);

create table if not exists public.content_play_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  device_id uuid references public.branch_devices(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  campaign_id uuid, -- FK added in business-advertising.sql once campaigns exists
  play_kind text not null check (play_kind in ('content', 'playlist_track', 'ad')),
  started_at timestamptz not null default now(),
  duration_ms integer,
  completed boolean not null default false
);

create index if not exists content_play_events_business_idx on public.content_play_events(business_id, started_at desc);
create index if not exists content_play_events_content_idx on public.content_play_events(content_item_id, started_at desc)
  where content_item_id is not null;
create index if not exists content_play_events_campaign_idx on public.content_play_events(campaign_id, started_at desc)
  where campaign_id is not null;

comment on table public.content_play_events is
  'Raw play-event log. "Top Content", "Content Plays", "Ad Plays", and campaign plays/reach/completionPct are all GROUP BY queries over this table, not stored columns — they would go stale otherwise.';

-- ── RLS ──
alter table public.device_heartbeats enable row level security;
alter table public.content_play_events enable row level security;

drop policy if exists "device_heartbeats_select" on public.device_heartbeats;
create policy device_heartbeats_select on public.device_heartbeats
  for select
  using (public.is_business_member(
    (select b.business_id
       from public.branch_devices d
       join public.branches b on b.id = d.branch_id
      where d.id = device_heartbeats.device_id),
    auth.uid()
  ));

drop policy if exists "content_play_events_select" on public.content_play_events;
create policy content_play_events_select on public.content_play_events
  for select
  using (public.is_business_member(content_play_events.business_id, auth.uid()));


-- ============================================================================
-- FILE: supabase/business-advertising.sql
-- ============================================================================
-- Advertisements: Campaigns (targeting the business's own locations/zones/
-- rooms, same pattern as Schedules/Announcements) + the cross-tenant Ad
-- Inventory marketplace (a business opts specific screens IN to sell ad
-- space to other advertisers — this is a genuinely separate, network-wide
-- concept per the mock data, not just "this business's own screens").
--
-- Campaign creatives reuse content_items (purpose = 'ad_creative') rather
-- than a duplicate `creatives` table — see business-content.sql.
--
-- Run after business-content.sql, business-analytics.sql (backfills the
-- content_play_events.campaign_id FK left null there).

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  objective text not null default 'awareness'
    check (objective in ('awareness', 'promotion', 'product_launch', 'event', 'announcement')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  creative_id uuid references public.content_items(id) on delete set null,
  placement_type text not null default 'between_content'
    check (placement_type in ('between_content', 'during_playlist_rotation', 'dedicated_slot')),
  frequency text,
  max_plays_per_day integer,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  budget_type text not null default 'total' check (budget_type in ('total', 'daily')),
  budget_amount numeric,
  start_date date,
  end_date date,
  active_start_time time,
  active_end_time time,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_business_idx on public.campaigns(business_id, status);

alter table public.content_play_events drop constraint if exists content_play_events_campaign_fk;
alter table public.content_play_events
  add constraint content_play_events_campaign_fk
    foreign key (campaign_id) references public.campaigns(id) on delete set null;

-- Plays/reach/completionPct are deliberately NOT columns here — they're
-- `select ... from content_play_events where campaign_id = ... and
-- play_kind = 'ad'` aggregates, same reasoning as business-analytics.sql.

create table if not exists public.campaign_target_locations (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (campaign_id, branch_id)
);

create table if not exists public.campaign_target_zones (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (campaign_id, zone_id)
);

create table if not exists public.campaign_target_rooms (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (campaign_id, room_id)
);

-- ── Ad Inventory marketplace (cross-tenant) ──
-- A business opts a screen IN (the "Enable Ad Inventory" promo banner CTA
-- on the dashboard) to make it bookable by other advertisers' campaigns.
-- One row per opted-in device; absence = not listed.
create table if not exists public.ad_inventory_listings (
  device_id uuid primary key references public.branch_devices(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  indicative_cpm numeric not null default 0,
  availability text not null default 'available' check (availability in ('available', 'booked', 'restricted')),
  opted_in_at timestamptz not null default now()
);

create index if not exists ad_inventory_listings_business_idx on public.ad_inventory_listings(business_id);

-- When another business's campaign books third-party inventory (as opposed
-- to targeting its own locations/zones/rooms above).
create table if not exists public.campaign_inventory_bookings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  listing_device_id uuid not null references public.ad_inventory_listings(device_id) on delete cascade,
  booked_at timestamptz not null default now(),
  unique (campaign_id, listing_device_id)
);

comment on table public.ad_inventory_listings is
  'V1 marketplace scaffold — only the opt-in/listing side is modelled here. Booking flow, pricing, and payout to the listing business are a follow-up design, not built out in this pass.';

-- ── RLS ──
alter table public.campaigns enable row level security;
alter table public.campaign_target_locations enable row level security;
alter table public.campaign_target_zones enable row level security;
alter table public.campaign_target_rooms enable row level security;
alter table public.ad_inventory_listings enable row level security;
alter table public.campaign_inventory_bookings enable row level security;

drop policy if exists "campaigns_select" on public.campaigns;
create policy campaigns_select on public.campaigns
  for select
  using (public.is_business_member(campaigns.business_id, auth.uid()));

drop policy if exists "campaign_target_locations_select" on public.campaign_target_locations;
create policy campaign_target_locations_select on public.campaign_target_locations
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_locations.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

drop policy if exists "campaign_target_zones_select" on public.campaign_target_zones;
create policy campaign_target_zones_select on public.campaign_target_zones
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_zones.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

drop policy if exists "campaign_target_rooms_select" on public.campaign_target_rooms;
create policy campaign_target_rooms_select on public.campaign_target_rooms
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_rooms.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

-- Inventory listings are the one place a business's row should be visible
-- to OTHER businesses too (that's the point of a marketplace) — readable by
-- any authenticated business staff, not just the owning business.
drop policy if exists "ad_inventory_listings_select" on public.ad_inventory_listings;
create policy ad_inventory_listings_select on public.ad_inventory_listings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "campaign_inventory_bookings_select" on public.campaign_inventory_bookings;
create policy campaign_inventory_bookings_select on public.campaign_inventory_bookings
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_inventory_bookings.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));


-- ============================================================================
-- FILE: supabase/business-settings.sql
-- ============================================================================
-- Business Settings: Billing & Plans, Integrations, Business Settings.
-- (Backs the UI just built at app/business/settings/{billing,integrations,business}.)
--
-- Billing deliberately does NOT reuse the existing consumer `subscriptions`
-- table/`subscription_plan` enum — business tiers (locations/screens/
-- storage/team-member limits) are a materially different product from the
-- consumer free/individual/business plans, and widening a shared enum via
-- ALTER TYPE ... ADD VALUE is both awkward (can't run in the same
-- transaction as its own use) and conceptually muddies two unrelated
-- billing relationships. A parallel, business-scoped table is simpler and
-- lower-risk than mutating shared consumer billing.
--
-- No table anywhere stores a raw card number — `payment_methods` only ever
-- holds Paystack's tokenized authorization_code plus a display label, which
-- is the only PCI-compliant way to do this.
--
-- Run after business.sql (needs business_profiles).

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'business', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  paystack_customer_code text,
  paystack_subscription_code text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plan limits are reference/config data (one row per plan), not per-business
-- — the Usage card computes `used` by counting the business's own rows
-- (branches, branch_devices, content_items.size_bytes, business_staff) and
-- compares against the row here for its plan.
create table if not exists public.plan_limits (
  plan text primary key check (plan in ('starter', 'business', 'enterprise')),
  max_locations integer,
  max_screens integer,
  max_storage_bytes bigint,
  max_team_members integer
);

insert into public.plan_limits (plan, max_locations, max_screens, max_storage_bytes, max_team_members) values
  ('starter', 5, 25, 10::bigint * 1024 * 1024 * 1024, 5),
  ('business', 10, 100, 50::bigint * 1024 * 1024 * 1024, 15),
  ('enterprise', null, null, null, null) -- null = unlimited
on conflict (plan) do nothing;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  provider text not null check (provider in ('card', 'mpesa', 'bank')),
  paystack_authorization_code text,
  label text not null,
  expiry_month smallint,
  expiry_year smallint,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payment_methods_business_idx on public.payment_methods(business_id);
create unique index if not exists payment_methods_one_primary_idx
  on public.payment_methods(business_id) where is_primary;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  paystack_invoice_reference text,
  description text not null,
  amount_kes numeric not null,
  status text not null default 'pending' check (status in ('paid', 'pending', 'failed')),
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  pdf_path text
);

create index if not exists invoices_business_idx on public.invoices(business_id, issued_at desc);

-- ── Integrations: static catalog + per-business connection state ──
create table if not exists public.integration_catalog (
  key text primary key, -- 'paystack' | 'youtube' | 'mpesa' | 'google' | 'whatsapp' | 'longi'
  name text not null,
  category text not null check (category in ('payments', 'music', 'devices', 'communication', 'analytics')),
  description text not null,
  availability text not null default 'available' check (availability in ('available', 'coming_soon'))
);

insert into public.integration_catalog (key, name, category, description, availability) values
  ('paystack', 'Paystack', 'payments', 'Collect payments and connect your business payment workflows.', 'available'),
  ('youtube', 'YouTube', 'music', 'Power music and video playback across Tazama.', 'available'),
  ('mpesa', 'M-Pesa', 'payments', 'Connect M-Pesa payments.', 'coming_soon'),
  ('google', 'Google', 'analytics', 'Connect Google services.', 'available'),
  ('whatsapp', 'WhatsApp', 'communication', 'Send customer-facing messages and business notifications.', 'coming_soon'),
  ('longi', 'Longi', 'devices', 'Connect supported smart metering/device systems.', 'available')
on conflict (key) do nothing;

-- Presence of a row = connected. No row = not connected. availability
-- (available/coming_soon) lives on the catalog above, not here.
create table if not exists public.business_integrations (
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  integration_key text not null references public.integration_catalog(key) on delete cascade,
  connected_at timestamptz not null default now(),
  account_label text,
  access_token text, -- encrypted at the application layer before write; never selected back to the client
  capabilities jsonb not null default '[]',
  primary key (business_id, integration_key)
);

-- ── Business Settings: profile/address/branding/preferences/privacy ──
create table if not exists public.business_settings (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,

  -- profile (business_name/phone already live on business_profiles — not duplicated here)
  business_type text,
  description text,
  email text,
  website text,
  logo_path text,

  -- address
  country text,
  county text,
  city text,
  address text,
  postal_code text,

  -- branding
  primary_color text,
  secondary_color text,
  content_style text check (content_style in ('brand_focused', 'modern', 'minimal')),

  -- Tazama preferences
  default_volume smallint check (default_volume between 0 and 100),
  announcement_behavior text check (announcement_behavior in ('reduce_volume', 'pause_music')),
  content_transition text check (content_transition in ('fade', 'cut', 'slide', 'zoom')),
  timezone text not null default 'Africa/Nairobi',

  -- notifications
  notify_screen_offline boolean not null default true,
  notify_campaign_performance boolean not null default true,
  notify_weekly_reports boolean not null default true,
  notify_billing boolean not null default true,
  push_critical_device_alerts boolean not null default true,
  push_daily_summary boolean not null default false,

  -- privacy
  audience_insights_enabled boolean not null default true,
  analytics_retention_days integer not null default 90,

  updated_at timestamptz not null default now()
);

-- Business-wide default operating hours (per-location overrides are a
-- possible future addition — not asked for by the current UI, which only
-- gives locations a timezone/status, not their own hours).
create table if not exists public.business_hours (
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Monday
  open_time time,
  close_time time,
  is_open boolean not null default true,
  primary key (business_id, day_of_week)
);

-- ── RLS ──
alter table public.business_subscriptions enable row level security;
alter table public.payment_methods enable row level security;
alter table public.invoices enable row level security;
alter table public.business_integrations enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_hours enable row level security;
-- plan_limits/integration_catalog are non-sensitive reference data — leave
-- RLS off, or add a permissive `using (true)` select policy if enabled.

drop policy if exists "business_subscriptions_select" on public.business_subscriptions;
create policy business_subscriptions_select on public.business_subscriptions
  for select
  using (public.is_business_member(business_subscriptions.business_id, auth.uid()));

drop policy if exists "payment_methods_select" on public.payment_methods;
create policy payment_methods_select on public.payment_methods
  for select
  using (public.is_business_member(payment_methods.business_id, auth.uid()));

drop policy if exists "invoices_select" on public.invoices;
create policy invoices_select on public.invoices
  for select
  using (public.is_business_member(invoices.business_id, auth.uid()));

drop policy if exists "business_integrations_select" on public.business_integrations;
create policy business_integrations_select on public.business_integrations
  for select
  using (public.is_business_member(business_integrations.business_id, auth.uid()));

drop policy if exists "business_settings_select" on public.business_settings;
create policy business_settings_select on public.business_settings
  for select
  using (public.is_business_member(business_settings.business_id, auth.uid()));

drop policy if exists "business_hours_select" on public.business_hours;
create policy business_hours_select on public.business_hours
  for select
  using (public.is_business_member(business_hours.business_id, auth.uid()));


-- ============================================================================
-- FILE: supabase/business-content-delivery.sql
-- ============================================================================
-- Closes two real gaps in the earlier business schema pass:
--
-- 1. `content_items.storage_path` pointed at a bucket that didn't exist.
--    Content library uploads (business's own promo videos/images/documents/
--    ad creatives) need real Supabase Storage — unlike Playlists, which are
--    correctly YouTube-sourced via the existing `tracks` table and never
--    touch Storage at all. These are two genuinely different pipelines and
--    both were meant to stay separate; this file only fixes the Storage
--    side, it does not change how playlists work.
--
--    Public bucket, not private like voice-notes' — content on these
--    screens has no confidentiality requirement (it's shown to whoever
--    walks into the venue), and a public bucket avoids having to refresh
--    signed URLs for a kiosk that may display one item for hours.
--
-- 2. There was no public, no-login-required way for a kiosk to know what
--    visual content/ad is currently on screen. `room_playback` already
--    solves exactly this for AUDIO — it's readable via `can_view_room()`
--    even with `auth.uid()` null, specifically so a kiosk with no session
--    can subscribe to it live (see branch-realtime-fix.sql). `schedules`/
--    `content_items`/`campaigns` are correctly staff-only (they're business
--    config, staff need to be able to author them) — but that means nothing
--    bridges "what SHOULD play" (config, staff-only) to "what IS on screen
--    right now" (a public, denormalized projection a kiosk can read).
--
--    `room_visual_state` is that bridge — the visual-content sibling of
--    `room_playback`. A server-side resolver (extending the existing
--    /api/business/branches/advance flow, or a small cron/edge function —
--    application code, not built in this pass) periodically evaluates the
--    active schedule/session for a room and writes a denormalized,
--    public-safe snapshot here. The kiosk NEVER queries schedules/
--    content_items/campaigns directly — same reason it never queries
--    `business_staff` directly today. This also gives ads a real delivery
--    path for free: an ad is just a content_items row (purpose =
--    'ad_creative'), so it rides this exact same table, flagged by is_ad.
--
-- Run after business-content.sql, business-schedules.sql, business-advertising.sql.

insert into storage.buckets (id, name, public)
values ('business-content', 'business-content', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — actual business scoping is
-- enforced by content_items' own RLS (you can only ever list rows for a
-- business you're staff of) and by the application layer namespacing
-- uploaded paths under the caller's business_id. Matches this schema's
-- established posture (business.sql's own note): fine-grained write control
-- lives in server actions, not in exhaustive Storage RLS.
drop policy if exists "business_content_upload" on storage.objects;
create policy business_content_upload on storage.objects
  for insert
  with check (bucket_id = 'business-content' and auth.role() = 'authenticated');

create table if not exists public.room_visual_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  content jsonb, -- denormalized {contentItemId, title, type, url, durationSeconds} — null when nothing is scheduled
  is_ad boolean not null default false,
  session_id uuid references public.schedule_sessions(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.room_visual_state is
  'Public read-model for "what''s on screen right now" — the visual-content sibling of room_playback. Written only by the server-side schedule resolver (service-role); never written by staff clients or kiosks directly.';

alter table public.room_visual_state enable row level security;

-- Mirrors room_playback's own policy exactly: same helper, same "public
-- when it''s a business room" semantics, so a kiosk with no session at all
-- can still read it.
drop policy if exists "room_visual_state_select" on public.room_visual_state;
create policy room_visual_state_select on public.room_visual_state
  for select
  using (public.can_view_room(room_id, auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_visual_state'
  ) then
    execute 'alter publication supabase_realtime add table public.room_visual_state';
  end if;
end $$;


-- ============================================================================
-- FILE: supabase/business-announcement-delivery.sql
-- ============================================================================
-- Closes the Storage gap for `announcements.audio_path` (business-announcements.sql
-- defines the column but never creates the bucket it points at).
--
-- Public bucket, not private like voice-notes' — same reasoning as
-- business-content-delivery.sql: announcement audio plays on unauthenticated
-- branch speakers/screens, and a scheduled or repeating announcement may not
-- actually play for hours or days, so a public URL avoids having to re-mint
-- a signed URL for a device with no session to authenticate a refresh with.
--
-- Run after business-announcements.sql.

insert into storage.buckets (id, name, public)
values ('announcement-audio', 'announcement-audio', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — actual business scoping is
-- enforced by `announcements`' own RLS and by the application layer
-- namespacing uploaded paths under the caller's business_id, matching
-- business-content-delivery.sql's own posture.
drop policy if exists "announcement_audio_upload" on storage.objects;
create policy announcement_audio_upload on storage.objects
  for insert
  with check (bucket_id = 'announcement-audio' and auth.role() = 'authenticated');


-- ============================================================================
-- FILE: supabase/business-screen-pairing.sql
-- ============================================================================
-- Dashboard-initiated device pairing: today's `device_pairings` flow only
-- runs one direction (a kiosk calls pair-init and shows a code, staff
-- claims it in the dashboard). Registering a screen from the "Add Location"
-- wizard needs the reverse — staff pre-declares a screen (room + name) from
-- the dashboard and gets a code before any physical device is involved.
--
-- No new table needed: `device_pairings.claimed_room_id` and
-- `branch_devices.room_id`/`device_kind`/`device_model` already exist (see
-- business-locations.sql). A dashboard-initiated row is simply inserted
-- already "claimed" (branch + room known up front) — `origin` just records
-- which direction created it, for clarity and so the claim-code endpoint
-- only ever matches rows meant for it.

alter table public.device_pairings
  add column if not exists origin text not null default 'device_initiated'
    check (origin in ('device_initiated', 'dashboard_initiated'));



-- ============================================================================
-- FILE: supabase/business-location-geo.sql
-- ============================================================================
-- Location Details step (Step 1 of the "Add Location" wizard): real map pin
-- coordinates + real Storage for the location photo upload.
--
-- 1. `branches.latitude`/`branches.longitude` — the wizard's map used to be
--    a fake decorative box with a fixed pin and no backing data at all.
--    Replaced with a real Leaflet/OpenStreetMap map whose draggable pin (and
--    "Locate" address lookup) needs somewhere real to persist to.
--
-- 2. `location-photos` bucket — `branches.image_path` already exists (added
--    by business-locations.sql) but nothing ever created the bucket it
--    points at, same gap business-content-delivery.sql closed for
--    `content_items.storage_path` → `business-content`. Public bucket, same
--    reasoning as that file: a location's photo (shown in the branches list
--    preview panel) has no confidentiality requirement, so a plain public
--    URL is simpler than signed-URL refresh for something that isn't
--    sensitive.
--
-- Run after business-locations.sql (needs `public.branches` to exist).
-- Must be appended to supabase/business-mvp-apply-all.sql (done, at the end).

alter table public.branches
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.branches.latitude is
  'Map pin latitude set from the "Add Location" wizard''s Step 1 map (drag-to-adjust or the Locate/geocode button). Nullable — older/incomplete locations may have no pin yet.';
comment on column public.branches.longitude is
  'Map pin longitude — see latitude''s comment.';

insert into storage.buckets (id, name, public)
values ('location-photos', 'location-photos', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — this runs during the wizard
-- before a branch row exists yet, so there's no branch to scope against at
-- Storage-policy level. Matches business-content-delivery.sql's own posture:
-- fine-grained write control lives in the server action (uploadLocationImage
-- in app/business/branches/new/actions.ts), not in exhaustive Storage RLS.
drop policy if exists "location_photos_upload" on storage.objects;
create policy location_photos_upload on storage.objects
  for insert
  with check (bucket_id = 'location-photos' and auth.role() = 'authenticated');

-- ============================================================================
-- FILE: supabase/business-audio-zone-playback.sql
-- ============================================================================
-- ============================================================================
-- Tazama — Audio Zone synchronized playback + multi-room volume
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business-audio-zones.sql,
-- business-locations.sql and branch-realtime-fix.sql.
--
-- See docs/superpowers/specs/2026-09-01-audio-zone-synchronized-playback-design.md
-- for the full design. Summary:
--  1. Volume moves from branches.volume (one dial per branch) to rooms.volume
--     (one dial per room) — needed now that a branch can have many rooms.
--  2. audio_zones gains a `synchronized_playback` toggle. When on, a zone's
--     covered rooms all play the same track from `audio_zone_playback` (the
--     zone's own canonical state) instead of each room having independent
--     state.
-- ============================================================================

-- 1. rooms.volume — per-room volume, replacing branches.volume going forward.
--    branches.volume is left in place, unused after this migration, same
--    "don't drop old columns" convention this schema already follows.
--
--    Guard: only add and backfill on the very first run. On re-runs of this
--    migration (or the combined apply-all file), the column stays untouched,
--    preserving any manual volume changes admins may have made.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms' and column_name = 'volume'
  ) then
    alter table public.rooms add column volume integer not null default 80;
    -- Backfill: give every branch's default room the branch's current volume,
    -- so an existing branch's kiosk sees no change in starting volume.
    update public.rooms r
    set volume = b.volume
    from public.branches b
    where b.room_id = r.id;
  end if;
end $$;

-- 2. rooms: let an anonymous/unauthenticated kiosk read + subscribe to its
--    own branch room's volume — the same fix branch-realtime-fix.sql already
--    made for `branches` (a branch room is 'private' with no members, so the
--    plain rooms_select policy silently drops every event for the exact
--    anonymous kiosk connection this feature depends on).
drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  access = 'public'
  or host_id = auth.uid()
  or public.is_room_member(id, auth.uid())
  or owner_business_id is not null
);

-- Narrow anon/authenticated to only the columns a kiosk actually needs —
-- without this, the public bypass above would also expose owner_business_id,
-- host_id, genres and about to anonymous kiosk clients. No client in this
-- app reads `rooms` directly today (every existing read goes through the
-- service-role client, confirmed via a full-repo grep), so this only enables
-- what the volume subscription newly needs and breaks nothing existing.
revoke select on public.rooms from anon, authenticated;
grant select (id, volume) on public.rooms to anon, authenticated;

-- 3. audio_zones.synchronized_playback — per-zone toggle, default off (every
--    existing zone keeps behaving exactly as it does today).
alter table public.audio_zones
  add column if not exists synchronized_playback boolean not null default false;

-- 4. audio_zone_playback — the zone's own canonical playback state, shaped
--    like room_playback plus a `version` counter used as the advance lock.
--    A kiosk reports the version it last observed when its track ends; the
--    advance endpoint does `update ... where zone_id = $1 and version =
--    $reportedVersion` — if that affects a row, this report won (first
--    valid reporter wins); if it affects zero rows, another report already
--    advanced past that version, so this one is a no-op. Atomic by
--    construction — no advisory lock or SELECT ... FOR UPDATE needed.
create table if not exists public.audio_zone_playback (
  zone_id     uuid primary key references public.audio_zones (id) on delete cascade,
  track       jsonb,
  is_playing  boolean not null default false,
  position_ms integer not null default 0,
  started_at  timestamptz,
  version     bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- One playback row per existing zone, so the first advance always has a row
-- to CAS against (version starts at 0, nothing playing yet).
insert into public.audio_zone_playback (zone_id)
select id from public.audio_zones
on conflict (zone_id) do nothing;

-- 5. can_view_audio_zone — direct analog of can_view_room's "public for
--    business-owned rows" logic. Audio zones only ever belong to businesses
--    (never a personal room), so the same "unlisted but shareable by direct
--    link" reasoning applies unchanged: a kiosk that was told the zone id
--    server-side can read its playback state.
create or replace function public.can_view_audio_zone(p_zone uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.audio_zones where id = p_zone);
$$;

alter table public.audio_zone_playback enable row level security;

drop policy if exists "audio_zone_playback_select" on public.audio_zone_playback;
create policy "audio_zone_playback_select" on public.audio_zone_playback for select using (
  public.can_view_audio_zone(zone_id, auth.uid())
);

-- All writes go through the service-role client (the zone-advance endpoint,
-- and later zone-level dashboard controls) — same posture as
-- audio_zone_rooms/branch_devices: read-only RLS, no insert/update policy.

-- 6. Realtime publication — `rooms` is already published (see rooms.sql);
--    audio_zone_playback is new.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audio_zone_playback'
  ) then
    execute 'alter publication supabase_realtime add table public.audio_zone_playback';
  end if;
end $$;

-- ============================================================================
-- FILE: supabase/branch-devices-room-backfill.sql
-- ============================================================================
-- ============================================================================
-- Tazama — backfill branch_devices.room_id for legacy claimDevice() pairings
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: only touches rows still NULL, so it converges and then
-- becomes a no-op — same idempotency convention as every other file here.
--
-- business-locations.sql documented branch_devices.room_id's null case as
-- "falls back to its branch's default room at the application layer," but
-- that fallback was never actually implemented anywhere that reads the
-- column (confirmed by grep) — this backfill plus the claimDevice() fix in
-- the same commit close the gap at the source instead of read-side patching
-- every future consumer of branch_devices.room_id.
-- ============================================================================

update public.branch_devices bd
set room_id = b.room_id
from public.branches b
where bd.branch_id = b.id
  and bd.room_id is null;

-- ============================================================================
-- FILE: supabase/business-track-durations.sql
-- ============================================================================
-- Real per-track durations for the shared YouTube catalog (public.tracks).
-- YouTube's search endpoint never returns duration — lib/youtube/durations.ts
-- makes a second `videos.list` call for it. Needed for the Schedules feature's
-- "actual track duration, not song count" playlist-duration validation.
-- Safe to re-run; idempotent. Run after schema.sql (creates public.tracks).

alter table public.tracks
  add column if not exists duration_seconds integer;

-- No backfill for existing rows — lib/tracks.ts's getTrackDurations() is a
-- read-through cache that resolves + patches any row still null on demand,
-- the same pattern ensureGenreSeeded() already uses for the catalog itself.

-- ============================================================================
-- FILE: supabase/business-schedule-playback.sql
-- ============================================================================
-- ============================================================================
-- Tazama — Schedules: synchronized-playback flag + per-item display duration
-- + the schedule's own playback-authority table.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business-schedules.sql and
-- business-audio-zone-playback.sql (this mirrors that file's CAS pattern).
--
-- A Schedule, once activated, temporarily overrides its targeted rooms'
-- normal Audio Zone / room playback — it never touches audio_zones or
-- audio_zone_playback themselves (see docs/superpowers/specs, the Schedules
-- design doc). This file gives it the same kind of canonical, CAS-locked
-- playback row `audio_zone_playback` gives a synchronized Audio Zone, plus
-- a content-item slot (audio_zone_playback has no visual layer to reuse —
-- a Schedule can show images/video, a Zone never does).
-- ============================================================================

-- 1. schedules.synchronized_playback — same on/off meaning as
--    audio_zones.synchronized_playback: on, every covered room shares one
--    canonical playback row; off, each covered room still follows the same
--    session/track/content sequence but keeps its own independent position.
alter table public.schedules
  add column if not exists synchronized_playback boolean not null default false;

-- 2. schedule_session_content.display_seconds — how long THIS item shows
--    within THIS schedule (per-item, not the content item's own intrinsic
--    length). Null = fall back to the content item's own content_items.
--    duration_seconds (natural video/audio length); the app layer requires
--    an explicit value at save time for an image (no natural length).
alter table public.schedule_session_content
  add column if not exists display_seconds integer;

-- 3. schedule_playback — the schedule's own canonical playback state.
--    Structurally the CAS-advance pattern audio_zone_playback already
--    established (version lock, first-valid-reporter-wins), plus a visual
--    content slot alongside the audio track slot — a session can have
--    either, both, or neither active depending on its content/playlist
--    layer toggles.
create table if not exists public.schedule_playback (
  schedule_id         uuid primary key references public.schedules(id) on delete cascade,
  session_id          uuid references public.schedule_sessions(id) on delete set null,
  track               jsonb,
  content_item_id     uuid references public.content_items(id) on delete set null,
  -- Denormalized snapshot (title/type/url/previewUrl/displaySeconds) of the
  -- row above — same reasoning as `track` being jsonb rather than just an
  -- id: the kiosk (no session, no other way to resolve a business's own
  -- content_items row) reads this realtime row directly with nothing else
  -- to join against.
  content             jsonb,
  content_started_at  timestamptz,
  is_playing          boolean not null default false,
  position_ms         integer not null default 0,
  started_at          timestamptz,
  version             bigint not null default 0,
  updated_at          timestamptz not null default now()
);

-- 4. can_view_schedule — direct analog of can_view_audio_zone: a schedule
--    only ever belongs to a business, so a kiosk told the schedule id
--    server-side can read its playback state.
create or replace function public.can_view_schedule(p_schedule uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.schedules where id = p_schedule);
$$;

alter table public.schedule_playback enable row level security;

drop policy if exists "schedule_playback_select" on public.schedule_playback;
create policy "schedule_playback_select" on public.schedule_playback for select using (
  public.can_view_schedule(schedule_id, auth.uid())
);

-- All writes go through the service-role client (the schedule-advance
-- routes, and the dashboard's own activate/live-control actions) — same
-- posture as audio_zone_playback: read-only RLS, no insert/update policy.

-- 5. Realtime publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_playback'
  ) then
    execute 'alter publication supabase_realtime add table public.schedule_playback';
  end if;
end $$;
