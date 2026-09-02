-- Real per-track durations for the shared YouTube catalog (public.tracks).
-- YouTube's search endpoint never returns duration — lib/youtube/durations.ts
-- makes a second `videos.list` call for it. Needed for the Schedules feature's
-- "actual track duration, not song count" playlist-duration validation.
-- Safe to re-run; idempotent. Run after schema.sql (creates public.tracks).

alter table public.tracks
  add column if not exists duration_seconds integer;

-- No backfill for existing rows — lib/tracks.ts's getTrackDurations() is a
-- read-through cache that resolves + patches any row still null on demand,
-- the same pattern ensureGenreSeeded() already uses for the catalog itself.
