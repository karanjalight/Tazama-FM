-- Location Details step (Step 1 of the "Add Location" wizard): real map pin
-- coordinates + real Storage for the location photo upload.
--
-- 1. `branches.latitude`/`branches.longitude` — the wizard's map used to be
--    a fake decorative box with a fixed pin and no backing data at all.
--    Replaced with a real Leaflet/OpenStreetMap map whose draggable pin (and
--    "Locate" address lookup) needs somewhere real to persist to.
--
-- 2. `location-photos` bucket — `branches.image_path` already exists (added
--    by business-locations.sql) but nothing ever created the bucket it
--    points at, same gap business-content-delivery.sql closed for
--    `content_items.storage_path` → `business-content`. Public bucket, same
--    reasoning as that file: a location's photo (shown in the branches list
--    preview panel) has no confidentiality requirement, so a plain public
--    URL is simpler than signed-URL refresh for something that isn't
--    sensitive.
--
-- Run after business-locations.sql (needs `public.branches` to exist).
-- Must be appended to supabase/business-mvp-apply-all.sql (done, at the end).

alter table public.branches
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.branches.latitude is
  'Map pin latitude set from the "Add Location" wizard''s Step 1 map (drag-to-adjust or the Locate/geocode button). Nullable — older/incomplete locations may have no pin yet.';
comment on column public.branches.longitude is
  'Map pin longitude — see latitude''s comment.';

insert into storage.buckets (id, name, public)
values ('location-photos', 'location-photos', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — this runs during the wizard
-- before a branch row exists yet, so there's no branch to scope against at
-- Storage-policy level. Matches business-content-delivery.sql's own posture:
-- fine-grained write control lives in the server action (uploadLocationImage
-- in app/business/branches/new/actions.ts), not in exhaustive Storage RLS.
drop policy if exists "location_photos_upload" on storage.objects;
create policy location_photos_upload on storage.objects
  for insert
  with check (bucket_id = 'location-photos' and auth.role() = 'authenticated');
