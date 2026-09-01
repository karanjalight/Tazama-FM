-- Dashboard-initiated device pairing: today's `device_pairings` flow only
-- runs one direction (a kiosk calls pair-init and shows a code, staff
-- claims it in the dashboard). Registering a screen from the "Add Location"
-- wizard needs the reverse — staff pre-declares a screen (room + name) from
-- the dashboard and gets a code before any physical device is involved.
--
-- No new table needed: `device_pairings.claimed_room_id` and
-- `branch_devices.room_id`/`device_kind`/`device_model` already exist (see
-- business-locations.sql). A dashboard-initiated row is simply inserted
-- already "claimed" (branch + room known up front) — `origin` just records
-- which direction created it, for clarity and so the claim-code endpoint
-- only ever matches rows meant for it.
--
-- Run after business-locations.sql.

alter table public.device_pairings
  add column if not exists origin text not null default 'device_initiated'
    check (origin in ('device_initiated', 'dashboard_initiated'));
