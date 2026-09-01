-- Closes two real gaps in the earlier business schema pass:
--
-- 1. `content_items.storage_path` pointed at a bucket that didn't exist.
--    Content library uploads (business's own promo videos/images/documents/
--    ad creatives) need real Supabase Storage — unlike Playlists, which are
--    correctly YouTube-sourced via the existing `tracks` table and never
--    touch Storage at all. These are two genuinely different pipelines and
--    both were meant to stay separate; this file only fixes the Storage
--    side, it does not change how playlists work.
--
--    Public bucket, not private like voice-notes' — content on these
--    screens has no confidentiality requirement (it's shown to whoever
--    walks into the venue), and a public bucket avoids having to refresh
--    signed URLs for a kiosk that may display one item for hours.
--
-- 2. There was no public, no-login-required way for a kiosk to know what
--    visual content/ad is currently on screen. `room_playback` already
--    solves exactly this for AUDIO — it's readable via `can_view_room()`
--    even with `auth.uid()` null, specifically so a kiosk with no session
--    can subscribe to it live (see branch-realtime-fix.sql). `schedules`/
--    `content_items`/`campaigns` are correctly staff-only (they're business
--    config, staff need to be able to author them) — but that means nothing
--    bridges "what SHOULD play" (config, staff-only) to "what IS on screen
--    right now" (a public, denormalized projection a kiosk can read).
--
--    `room_visual_state` is that bridge — the visual-content sibling of
--    `room_playback`. A server-side resolver (extending the existing
--    /api/business/branches/advance flow, or a small cron/edge function —
--    application code, not built in this pass) periodically evaluates the
--    active schedule/session for a room and writes a denormalized,
--    public-safe snapshot here. The kiosk NEVER queries schedules/
--    content_items/campaigns directly — same reason it never queries
--    `business_staff` directly today. This also gives ads a real delivery
--    path for free: an ad is just a content_items row (purpose =
--    'ad_creative'), so it rides this exact same table, flagged by is_ad.
--
-- Run after business-content.sql, business-schedules.sql, business-advertising.sql.

insert into storage.buckets (id, name, public)
values ('business-content', 'business-content', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — actual business scoping is
-- enforced by content_items' own RLS (you can only ever list rows for a
-- business you're staff of) and by the application layer namespacing
-- uploaded paths under the caller's business_id. Matches this schema's
-- established posture (business.sql's own note): fine-grained write control
-- lives in server actions, not in exhaustive Storage RLS.
drop policy if exists "business_content_upload" on storage.objects;
create policy business_content_upload on storage.objects
  for insert
  with check (bucket_id = 'business-content' and auth.role() = 'authenticated');

create table if not exists public.room_visual_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  content jsonb, -- denormalized {contentItemId, title, type, url, durationSeconds} — null when nothing is scheduled
  is_ad boolean not null default false,
  session_id uuid references public.schedule_sessions(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.room_visual_state is
  'Public read-model for "what''s on screen right now" — the visual-content sibling of room_playback. Written only by the server-side schedule resolver (service-role); never written by staff clients or kiosks directly.';

alter table public.room_visual_state enable row level security;

-- Mirrors room_playback's own policy exactly: same helper, same "public
-- when it''s a business room" semantics, so a kiosk with no session at all
-- can still read it.
drop policy if exists "room_visual_state_select" on public.room_visual_state;
create policy room_visual_state_select on public.room_visual_state
  for select
  using (public.can_view_room(room_id, auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_visual_state'
  ) then
    execute 'alter publication supabase_realtime add table public.room_visual_state';
  end if;
end $$;
