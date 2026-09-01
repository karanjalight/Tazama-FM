-- ============================================================================
-- Tazama — backfill branch_devices.room_id for legacy claimDevice() pairings
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: only touches rows still NULL, so it converges and then
-- becomes a no-op — same idempotency convention as every other file here.
--
-- business-locations.sql documented branch_devices.room_id's null case as
-- "falls back to its branch's default room at the application layer," but
-- that fallback was never actually implemented anywhere that reads the
-- column (confirmed by grep) — this backfill plus the claimDevice() fix in
-- the same commit close the gap at the source instead of read-side patching
-- every future consumer of branch_devices.room_id.
-- ============================================================================

update public.branch_devices bd
set room_id = b.room_id
from public.branches b
where bd.branch_id = b.id
  and bd.room_id is null;
