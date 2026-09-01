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
alter table public.rooms
  add column if not exists volume integer not null default 80;

-- Backfill: give every branch's default room the branch's current volume,
-- so an existing branch's kiosk sees no change in starting volume.
update public.rooms r
set volume = b.volume
from public.branches b
where b.room_id = r.id;

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
