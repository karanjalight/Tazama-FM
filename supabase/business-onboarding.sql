-- Business onboarding tour — analytics only.
-- Paste into the Supabase SQL editor (run after business.sql). Standalone on
-- purpose. Tour *progress* is not stored here: it lives on each person's auth
-- user_metadata ("business_tour", "business_checklist"), so the tour works
-- without this file. This file only records the event stream that shows
-- where people drop off. Until it is applied, events are silently dropped.

create table if not exists public.business_tour_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  business_id  uuid not null references public.business_profiles (id) on delete cascade,
  role         text not null check (role in ('owner', 'admin', 'manager')),
  tour_version integer not null,
  event        text not null check (event in ('started', 'step_viewed', 'skipped', 'completed')),
  source       text not null check (source in ('auto', 'help', 'checklist')),
  step_id      text not null,
  step_index   integer not null,
  total_steps  integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists business_tour_events_funnel_idx
  on public.business_tour_events (tour_version, step_id, event);

-- Written and read by the service role only: RLS on, deliberately no policies.
alter table public.business_tour_events enable row level security;

-- Drop-off funnel: how many distinct people reached, skipped at, or finished
-- from each step. step_id (not just index) because managers get a shorter tour.
create or replace view public.business_tour_funnel
with (security_invoker = true) as
select
  tour_version,
  step_id,
  min(step_index)                                              as step_index,
  count(distinct user_id) filter (where event = 'step_viewed') as people_reached,
  count(distinct user_id) filter (where event = 'skipped')     as people_skipped_here,
  count(distinct user_id) filter (where event = 'completed')   as people_completed
from public.business_tour_events
group by tour_version, step_id;

revoke all on public.business_tour_funnel from anon, authenticated;

-- Example: select * from public.business_tour_funnel order by tour_version, step_index;
