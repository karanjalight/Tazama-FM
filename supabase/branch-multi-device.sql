-- ============================================================================
-- Tazama — Multi-device branch pairing + room presence tracking
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business.sql and branch-controls.sql.
-- ============================================================================

-- 1. branch_devices — replaces branches.device_paired_at/device_last_seen_at
--    as the source of truth (those columns are left in place, unused going
--    forward, to avoid a destructive column drop).
create table if not exists public.branch_devices (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references public.branches (id) on delete cascade,
  name         text not null default 'Device',
  device_token text not null unique,
  paired_at    timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists branch_devices_branch_idx on public.branch_devices (branch_id);

-- 2. room_presence — lightweight "who's actively viewing this room" tracking.
--    Guests deliberately never join room_members (see the room-parity design),
--    so this is the only way to know how many people are currently on a
--    branch's room page. One row per (room, actor); upserted on each ping.
create table if not exists public.room_presence (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  actor_id     text not null,
  last_seen_at timestamptz not null default now(),
  primary key (room_id, actor_id)
);
create index if not exists room_presence_room_idx on public.room_presence (room_id, last_seen_at);

-- 3. RLS — both tables are written/read only via the service-role client
--    (never directly by anon/authenticated clients), so enable RLS with no
--    policies at all (deny-by-default; service-role bypasses RLS regardless).
alter table public.branch_devices enable row level security;
alter table public.room_presence  enable row level security;
