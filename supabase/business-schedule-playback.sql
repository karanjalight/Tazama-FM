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
