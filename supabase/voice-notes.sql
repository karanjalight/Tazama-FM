-- Voice notes: a new message kind on the existing chat schema (supabase/social.sql
-- must already be applied), a private Storage bucket for the audio, and Realtime
-- replication on `messages` so a global (not per-thread) listener can react to a
-- new voice note regardless of which page the recipient is on.
--
-- Run in the Supabase SQL editor (or psql) once. Safe to re-run (idempotent).

-- 1. Widen messages.kind to allow 'voice' ------------------------------------
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'track', 'voice'));

alter table public.messages add column if not exists voice_path text;
alter table public.messages add column if not exists voice_duration_ms integer;

-- 2. voice_note_plays -----------------------------------------------------------
-- Per-recipient played state — a flat column on `messages` can't represent this
-- correctly once a conversation has more than one recipient (group chats).
create table if not exists public.voice_note_plays (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  played_at  timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists voice_note_plays_user_idx
  on public.voice_note_plays (user_id);

alter table public.voice_note_plays enable row level security;

drop policy if exists "voice_note_plays_select_own" on public.voice_note_plays;
create policy "voice_note_plays_select_own" on public.voice_note_plays
  for select using (user_id = auth.uid());
-- No insert/update/delete policy: writes go through the service-role admin
-- client (markVoiceNotePlayedAction), which re-checks conversation
-- participation before writing — same pattern as every other table here.

-- 3. voice-notes Storage bucket --------------------------------------------------
-- Private, and deliberately has NO storage.objects policies for this bucket:
-- every access (upload, signed-URL generation) goes through a server action
-- using the service-role client, which bypasses RLS and does its own
-- isParticipant check first. With RLS enabled and zero permissive policies,
-- the anon/authenticated keys get no access at all — that absence is the
-- security control, not an oversight.
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

-- 4. Realtime replication on messages --------------------------------------------
-- Required for the global (cross-page) voice-note listener, which subscribes to
-- postgres_changes INSERTs on `messages` rather than the per-conversation
-- broadcast channel chats already use (that channel only reaches a client with
-- that specific thread open). `ADD TABLE` errors if already a publication
-- member, so this is guarded to stay idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
