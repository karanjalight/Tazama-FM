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
