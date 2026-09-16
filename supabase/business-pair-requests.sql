-- =============================================================================
-- Tazama — Pair with a Screen (/pair/[deviceSlug])
--
-- 1. venue_requests / venue_request_likes — a guest's "play this next" song
--    request, one FIFO per room. Claimed at the top of every advance path
--    (room route, synchronized audio zone, schedule), so a request plays next
--    no matter which source is currently driving the room.
-- 2. playlist_cursor on every playback table — the playlist's resume point
--    while guest requests are playing, so a request never restarts or skips
--    the schedule / zone / room playlist.
-- 3. branch_devices.slug — the public, unguessable-enough id in a device's
--    pairing link/QR (device names repeat across branches).
--
-- Safe to re-run. Paste into the Supabase SQL editor.
-- The app keeps working (without these features) until this is applied.
-- =============================================================================

-- 1. Guest song requests ------------------------------------------------------
create table if not exists public.venue_requests (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id) on delete cascade,
  track         jsonb not null,                -- {youtubeId,title,artist,thumbnailUrl}
  added_by      text not null,                 -- profile id or "guest-<uuid>"
  added_by_name text,
  status        text not null default 'queued' check (status in ('queued', 'played')),
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists venue_requests_room_status_idx
  on public.venue_requests (room_id, status, created_at);

create table if not exists public.venue_request_likes (
  request_id uuid not null references public.venue_requests (id) on delete cascade,
  actor_id   text not null,
  created_at timestamptz not null default now(),
  primary key (request_id, actor_id)
);

-- Written/read only through the service-role client (app code enforces who
-- may add/remove/like) — deny-by-default for anon/authenticated.
alter table public.venue_requests      enable row level security;
alter table public.venue_request_likes enable row level security;

-- 2. Playlist resume point ----------------------------------------------------
alter table public.room_playback       add column if not exists playlist_cursor text;
alter table public.audio_zone_playback add column if not exists playlist_cursor text;
alter table public.schedule_playback   add column if not exists playlist_cursor text;

-- 3. Device pairing slugs -----------------------------------------------------
alter table public.branch_devices add column if not exists slug text;
create unique index if not exists branch_devices_slug_key on public.branch_devices (slug);

-- "Bar TV" -> "bar-tv-3f9a2c"
create or replace function public.branch_device_slug(p_name text)
returns text
language sql
volatile
as $$
  select coalesce(
           nullif(
             trim(both '-' from left(
               trim(both '-' from lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g'))),
               40
             )),
             ''
           ),
           'screen'
         )
         || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
$$;

create or replace function public.branch_devices_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.branch_device_slug(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists branch_devices_set_slug on public.branch_devices;
create trigger branch_devices_set_slug
  before insert on public.branch_devices
  for each row execute function public.branch_devices_set_slug();

update public.branch_devices
set slug = public.branch_device_slug(name)
where slug is null;
