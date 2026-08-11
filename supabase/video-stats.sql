-- Cached YouTube view counts for shared-track cards (and anywhere else that
-- wants a "1.2M views" style stat later). A read-through cache — the API
-- route only re-fetches from YouTube when an id is missing or its
-- fetched_at is stale, so a popular shared track doesn't burn API quota on
-- every card render.
--
-- Run in the Supabase SQL editor (or psql) once. Safe to re-run (idempotent).

create table if not exists public.video_stats (
  youtube_id text primary key,
  view_count bigint,
  fetched_at timestamptz not null default now()
);

alter table public.video_stats enable row level security;

drop policy if exists "video_stats_select_all" on public.video_stats;
create policy "video_stats_select_all" on public.video_stats
  for select using (true); -- view counts aren't sensitive; same as point_events/user_badges
-- No client insert/update/delete policy: the service-role admin client (the
-- stats API route) owns every write.
