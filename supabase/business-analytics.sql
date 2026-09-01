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
