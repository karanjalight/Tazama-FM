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
