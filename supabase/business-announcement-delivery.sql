-- Closes the Storage gap for `announcements.audio_path` (business-announcements.sql
-- defines the column but never creates the bucket it points at).
--
-- Public bucket, not private like voice-notes' — same reasoning as
-- business-content-delivery.sql: announcement audio plays on unauthenticated
-- branch speakers/screens, and a scheduled or repeating announcement may not
-- actually play for hours or days, so a public URL avoids having to re-mint
-- a signed URL for a device with no session to authenticate a refresh with.
--
-- Run after business-announcements.sql.

insert into storage.buckets (id, name, public)
values ('announcement-audio', 'announcement-audio', true)
on conflict (id) do nothing;

-- Any authenticated business user may upload — actual business scoping is
-- enforced by `announcements`' own RLS and by the application layer
-- namespacing uploaded paths under the caller's business_id, matching
-- business-content-delivery.sql's own posture.
drop policy if exists "announcement_audio_upload" on storage.objects;
create policy announcement_audio_upload on storage.objects
  for insert
  with check (bucket_id = 'announcement-audio' and auth.role() = 'authenticated');
