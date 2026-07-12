-- ============================================================================
-- Tazama — Branch remote controls (volume)
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business.sql.
-- ============================================================================

alter table public.branches
  add column if not exists volume smallint not null default 80;
