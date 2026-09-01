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
