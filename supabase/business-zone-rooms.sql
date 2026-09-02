-- ============================================================================
-- Tazama — Zone Rooms: a public, joinable consumer page for an Audio Zone
-- (/zones/[slug]), mirroring the consumer Rooms feature. Paste this whole
-- file into the Supabase SQL editor and run it once. Safe to re-run: it is
-- idempotent. Run AFTER business-audio-zones.sql and
-- business-audio-zone-playback.sql (needs audio_zones, can_view_audio_zone).
-- ============================================================================

-- 1. audio_zones.slug — a real, human-readable, shareable identifier.
--    audio_zones had no public identifier at all before this — RLS on the
--    table itself is staff-only (is_business_staff), so a public /zones/[slug]
--    page never reads the raw table directly; it goes through the
--    service-role client server-side, same posture as every other business
--    query in this app. New zones get a real slugify()+uniqueSlug() retry
--    loop in application code (createAudioZone) — this backfill is only for
--    zones that already existed before this migration, so it just needs to
--    be unique, not pretty; the id suffix guarantees that without a SQL-side
--    retry loop.
alter table public.audio_zones add column if not exists slug text unique;

update public.audio_zones
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
where slug is null;

-- 2. audio_zone_queue / audio_zone_queue_likes — a zone-room joiner's track
--    suggestions, feeding directly into the zone's real rotation
--    (advanceZonePlayback checks this before its existing playlist/genre
--    resolution — see lib/business/audio-zone-playback.ts). Structurally
--    identical to room_queue/room_track_likes (supabase/rooms.sql), right
--    down to the `text`-typed added_by/user_id columns — a zone-room guest's
--    id is an opaque "guest-<uuid>" string, not a real uuid, same reason
--    Rooms' equivalent columns aren't FK'd to profiles.
create table if not exists public.audio_zone_queue (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.audio_zones(id) on delete cascade,
  track jsonb not null,
  added_by text,
  added_by_name text,
  played boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists audio_zone_queue_zone_idx on public.audio_zone_queue(zone_id, created_at);

create table if not exists public.audio_zone_queue_likes (
  queue_id uuid not null references public.audio_zone_queue(id) on delete cascade,
  user_id text not null,
  zone_id uuid not null references public.audio_zones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (queue_id, user_id)
);
create index if not exists audio_zone_queue_likes_zone_idx on public.audio_zone_queue_likes(zone_id);

-- 3. RLS — select-only, same "unlisted but shareable by link" posture as
--    audio_zone_playback/schedule_playback (can_view_audio_zone already
--    exists from business-audio-zone-playback.sql: true whenever the zone
--    row exists). All writes go through service-role server actions
--    (app/zones/actions.ts) — never a direct client insert, so no
--    insert/update/delete policy is needed.
alter table public.audio_zone_queue enable row level security;
alter table public.audio_zone_queue_likes enable row level security;

drop policy if exists "audio_zone_queue_select" on public.audio_zone_queue;
create policy "audio_zone_queue_select" on public.audio_zone_queue for select using (
  public.can_view_audio_zone(zone_id, auth.uid())
);

drop policy if exists "audio_zone_queue_likes_select" on public.audio_zone_queue_likes;
create policy "audio_zone_queue_likes_select" on public.audio_zone_queue_likes for select using (
  public.can_view_audio_zone(zone_id, auth.uid())
);

-- No realtime-publication entries needed — the queue uses the same
-- broadcast-ping-then-refetch pattern room_queue already established for
-- Rooms (sendQueuePing() -> fetchZoneQueue() server action), not Postgres
-- Changes, so there's nothing here for a client to subscribe to directly.
