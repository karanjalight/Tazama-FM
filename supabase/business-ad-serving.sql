-- Real ad serving: live takeover of kiosk playback, per-screen targeting,
-- per-player play counting, and screen-level ad settings (ads on/off + CPM).
--
-- Run after business-advertising.sql, business-analytics.sql,
-- business-audio-zone-playback.sql and business-schedule-playback.sql.
-- Safe to re-run — every statement is guarded.
--
-- Design: docs/superpowers/specs/2026-09-16-advertising-serving-and-analytics-design.md
--
-- How it fits together:
--   * A kiosk ticks /api/business/rooms/[roomId]/ads/tick. When a campaign is
--     due, the server inserts one `ad_breaks` row (one AIRING) and stamps a
--     snapshot of it onto whichever playback row the kiosk follows
--     (schedule_playback > audio_zone_playback > room_playback) as
--     `active_ad`. Every kiosk already subscribed to that row learns about the
--     ad at the same instant, and `active_ad is null` in the claim's WHERE
--     clause guarantees only one break per source at a time.
--   * Each player that actually renders the ad writes ONE content_play_events
--     row tied to the break (`ad_break_id`) — that row is the play counter.
--   * Views/reach/revenue are never stored: they're estimated at read time
--     from real plays × room capacity × screen CPM (lib/business/ad-estimates.ts).

-- ── Campaign fields the real UI needs ──
alter table public.campaigns
  add column if not exists advertiser_name text,
  add column if not exists display_seconds integer;

alter table public.campaigns drop constraint if exists campaigns_display_seconds_check;
alter table public.campaigns
  add constraint campaigns_display_seconds_check
    check (display_seconds is null or display_seconds between 3 and 300);

-- ── Per-screen targeting (same shape as schedule_target_screens) ──
create table if not exists public.campaign_target_screens (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  device_id uuid not null references public.branch_devices(id) on delete cascade,
  primary key (campaign_id, device_id)
);

create index if not exists campaign_target_screens_device_idx on public.campaign_target_screens(device_id);

-- ── Screen-level ad settings (Ad Inventory page) ──
-- `ad_cpm` null = the app-wide default CPM (KES 400 per 1,000 estimated views).
alter table public.branch_devices
  add column if not exists ads_enabled boolean not null default true,
  add column if not exists ad_cpm numeric;

alter table public.branch_devices drop constraint if exists branch_devices_ad_cpm_check;
alter table public.branch_devices
  add constraint branch_devices_ad_cpm_check check (ad_cpm is null or ad_cpm >= 0);

-- ── Airings ──
-- `room_ids` null = every room following the source shows it (a "full"
-- break — the only kind allowed to pause music). Otherwise the break is
-- "partial": only players in `room_ids`, or paired screens in `screen_ids`,
-- show it.
create table if not exists public.ad_breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  source_kind text not null check (source_kind in ('schedule', 'zone', 'room')),
  source_id uuid not null,
  room_ids uuid[],
  screen_ids uuid[] not null default '{}',
  pauses_music boolean not null default false,
  -- Whether the frozen source was playing when the break claimed it, so
  -- resuming never un-pauses music staff had deliberately paused.
  resume_playing boolean not null default true,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz
);

alter table public.ad_breaks add column if not exists resume_playing boolean not null default true;

create index if not exists ad_breaks_source_idx on public.ad_breaks(source_kind, source_id, started_at desc);
create index if not exists ad_breaks_campaign_idx on public.ad_breaks(campaign_id, started_at desc);
create index if not exists ad_breaks_business_idx on public.ad_breaks(business_id, started_at desc);
create index if not exists ad_breaks_open_idx on public.ad_breaks(business_id) where ended_at is null;

-- ── Live takeover flag on each playback table ──
-- Snapshot shape (lib/business/ad-types.ts ActiveAdSnapshot):
--   { breakId, campaignId, contentItemId, title, advertiser,
--     contentType, url, durationSeconds, startedAt, endsAt,
--     roomIds: uuid[] | null, screenIds: uuid[], pausesMusic }
alter table public.room_playback       add column if not exists active_ad jsonb;
alter table public.audio_zone_playback add column if not exists active_ad jsonb;
alter table public.schedule_playback   add column if not exists active_ad jsonb;

-- ── Play counter: one content_play_events row per player per airing ──
alter table public.content_play_events
  add column if not exists ad_break_id uuid references public.ad_breaks(id) on delete cascade;

create index if not exists content_play_events_ad_break_idx on public.content_play_events(ad_break_id)
  where ad_break_id is not null;

-- A player can only count once per airing. Unpaired players (no device) are
-- keyed by room, so several open browser tabs in one room still count once.
create unique index if not exists content_play_events_ad_impression_uidx
  on public.content_play_events (ad_break_id, (coalesce(device_id::text, 'room:' || room_id::text)))
  where ad_break_id is not null;

-- ── Dashboard rollup: plays grouped per airing × room ──
-- Keeps dashboards from paging through every raw play row. Service role only.
create or replace function public.ad_impression_rollup(p_business uuid, p_from timestamptz, p_to timestamptz)
returns table (
  ad_break_id uuid,
  campaign_id uuid,
  started_at timestamptz,
  room_id uuid,
  device_ids uuid[],
  impressions integer,
  completed integer
)
language sql stable security definer set search_path = public as $$
  select
    e.ad_break_id,
    b.campaign_id,
    b.started_at,
    e.room_id,
    coalesce(array_agg(distinct e.device_id) filter (where e.device_id is not null), '{}') as device_ids,
    count(*)::integer as impressions,
    (count(*) filter (where e.completed))::integer as completed
  from public.content_play_events e
  join public.ad_breaks b on b.id = e.ad_break_id
  where e.business_id = p_business
    and e.play_kind = 'ad'
    and b.started_at >= p_from
    and b.started_at < p_to
  group by e.ad_break_id, b.campaign_id, b.started_at, e.room_id
  order by b.started_at, e.ad_break_id, e.room_id
$$;

revoke all on function public.ad_impression_rollup(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.ad_impression_rollup(uuid, timestamptz, timestamptz) to service_role;

-- ── RLS ──
alter table public.campaign_target_screens enable row level security;
alter table public.ad_breaks enable row level security;

drop policy if exists "campaign_target_screens_select" on public.campaign_target_screens;
create policy campaign_target_screens_select on public.campaign_target_screens
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_screens.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

drop policy if exists "ad_breaks_select" on public.ad_breaks;
create policy ad_breaks_select on public.ad_breaks
  for select
  using (public.is_business_member(ad_breaks.business_id, auth.uid()));
