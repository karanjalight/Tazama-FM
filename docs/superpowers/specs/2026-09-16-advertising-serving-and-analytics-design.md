# Advertising: real ad serving, play counting & estimates — design

Date: 2026-09-16 · Status: approved by user ("proceed") · Scope: `/business/advertisements/**` + kiosk ad takeover

## Decisions (from the user)

| Question | Answer |
|---|---|
| Data source | **Real data only**: no mock numbers and no seeded history. Empty or zero states until kiosks actually air ads. |
| Revenue | **CPM on estimated views**, capped at the campaign budget (daily or total). |
| Targeting | **Locations → Zones → Rooms → individual Screens.** |
| Inventory | **The business's own screens** (no cross-business marketplace). |

## Starting point (what existed)

- Campaign CRUD, the Campaigns page and the Ad Library are real (`app/business/advertisements/actions.ts`, `lib/business/campaign-*.ts`).
- The Overview KPIs/chart/tables, the Performance page and the Inventory page were 100% mock (`mock-data.ts`, `data-engine.ts`, `inventory/mock-data.ts`, `types.ts`, `new/campaign-estimate.ts`).
- A half-built, **uncommitted, never-applied** ad-serving layer (`business-ad-serving.sql`, `lib/business/ad-{types,resolver,playback,events}.ts`, `due-ad`/`ads/start`/`ads/complete` routes). The kiosk imported a non-existent `components/player/ad-overlay`, which broke `npm run build`, and it never polled for ads.
- Live DB: the campaign tables exist (1 real campaign). The `active_ad`/`play_meta` columns do not exist, and `content_play_events` has 0 rows.

That unapplied layer is **replaced** by the design below. Its core idea of stamping `active_ad` on the playback row is kept.

## 1. Data model: `supabase/business-ad-serving.sql` (rewritten; user runs it in the SQL editor)

- `campaigns` + `advertiser_name text`, + `display_seconds int` (image ads; 3–300).
- `campaign_target_screens(campaign_id, device_id)`. Same shape as `schedule_target_screens`.
- `branch_devices` + `ads_enabled boolean not null default true`, + `ad_cpm numeric` (null ⇒ default KES 400).
- `ad_breaks`: **one row per airing on a playback source.**
  `id, business_id, campaign_id, content_item_id, source_kind ('schedule'|'zone'|'room'), source_id, room_ids uuid[] (null = every room following the source), screen_ids uuid[], pauses_music bool, started_at, ends_at, ended_at`.
- `room_playback` / `audio_zone_playback` / `schedule_playback` + `active_ad jsonb`: the realtime fan-out and the "one break at a time" lock.
- `content_play_events` + `ad_break_id uuid` → **one row per player that actually showed the ad** (this is the play counter). Unique on `(ad_break_id, coalesce(device_id, 'room:'||room_id))`.
- `ad_impression_rollup(p_business, p_from, p_to)` (service-role-only SQL function): impressions grouped per break × room. This keeps the dashboards from fetching raw rows.
- RLS: select for business members on the new tables. Writes happen through the service role only.

## 2. Serving: the ad takes over the screens

**Snapshot** (`lib/business/ad-types.ts`, stored in `active_ad`):
`{ breakId, campaignId, contentItemId, title, advertiser, contentType, url, durationSeconds, startedAt, endsAt, roomIds: string[]|null, screenIds: string[], pausesMusic }`.
A player shows it iff `roomIds === null || roomIds.includes(playerRoomId) || screenIds.includes(playerDeviceId)`.

**Tick.** Every 30s, and once on mount, each branch kiosk calls `POST /api/business/rooms/[roomId]/ads/tick {deviceToken?}`:
1. Resolve the player's device from `tz_device_token` (optional; unpaired browser players still work at room level).
2. Resolve the authoritative source (Schedule > synchronized Audio Zone > Room), mirroring the kiosk.
3. If the source already has an `active_ad`: return it. If it is stale (`now > endsAt + 30s`, i.e. the kiosk crashed), release it and end the break first.
4. Candidate campaigns cover the player: screen target ∋ device, or room/zone/location target ∋ room. Filters: `status = active`, date range and active hours in the branch timezone (overnight windows supported), `branches.allow_ads`, `branch_devices.ads_enabled`, approved creative.
5. Due check, keyed by **source** (`ad_breaks` history): `frequency` minutes since the last break, `max_plays_per_day` breaks since local midnight. The winner has the highest priority; ties go to the campaign waiting longest.
6. Break targets from the rooms and screens following the source:
   - If every following room is covered at room level, and none has an ads-disabled screen or an ads-disallowed branch ⇒ `roomIds = null` (**full break**).
   - Otherwise explicit `roomIds` plus `screenIds` (**partial break**).
7. `pausesMusic = contentType ∈ {video, audio} && roomIds === null`.
8. Insert the `ad_breaks` row, then claim the source: `update … set active_ad = snapshot where active_ad is null` (+ `version` CAS and position freeze when `pausesMusic`). On a lost race, delete the break row and return the winner's snapshot.

**Impressions.** `POST /api/business/ads/impression {breakId, roomId, deviceToken?, phase: 'start'|'end', completed?, durationMs?}`:
- `start` inserts the play row (duplicates are ignored).
- `end` marks it completed with its duration, then ends the break: it clears `active_ad` (guarded by `breakId`), resumes the source at its frozen position when `pausesMusic`, and sets `ended_at`.

**Phones / other sessions (read-only).** `GET /api/business/rooms/[roomId]/ads/current` → `{ ad: ActiveAdSnapshot | null }`.

**Kiosk** (`kiosk-room-player.tsx` + new `components/player/ad-overlay.tsx`):
- Full-bleed creative (video/image/audio/document card) at z-30, with a fade in/out and an "Ad · Advertiser · 0:12" countdown chip.
- Late joiners seek video to the elapsed offset.
- Video/audio ads **hold the music**: incoming playback payloads are deferred and the local player is paused. At the end, the latest payload is applied:
  - A full break resumes at the frozen spot.
  - A partial break rejoins the live song.
- Image ads leave the music playing.
- Skip is disabled while an ad is on screen.
- Media errors end the impression with `completed = false`.
- Durations: video/audio use media length (fallback 30s). Images use `display_seconds` (fallback 15s).

## 3. Estimates: `lib/business/ad-estimates.ts` (pure, unit-tested, client-safe)

- **Plays** = real impression rows. **Airings** = breaks. **Completion** = completed ÷ plays.
- **Estimated views**, per break × room: `capacity × occupancy(hour, weekday) × 0.65 attention × min(1, screensShown ÷ pairedScreensInRoom)`.
  - `capacity` defaults to 40.
  - The occupancy curve is hospitality-shaped: lunch and evening peaks, a Fri/Sat uplift.
- **Estimated reach** = `views ÷ max(1, dwellMinutes(roomType) ÷ campaignFrequencyMinutes)`.
- **Estimated revenue** = `views ÷ 1000 × avg CPM of the screens that showed it`.
  - Capped per campaign: a daily budget per local day; a total budget cumulatively from the campaign's first airing.
- **Projection** (wizard), from the targeted rooms' real capacities, room types and screen CPMs, frequency, daily cap, active hours and date range:
  - Per-day plays, views, reach and revenue (capped).
  - Replaces the fake `0.84 plays/KES`.
- Every page has a "How we estimate" popover listing these assumptions.

## 4. Server reads & actions

- `lib/business/ad-analytics.ts`: `getAdAnalytics(viewer, {from, to, locationId?, campaignId?, advertiser?})` returns:
  - totals plus previous-period totals;
  - a daily series;
  - by campaign (incl. plays today), by location, by room and by screen;
  - a weekday × hour heatmap;
  - derived insights.
  It returns empty results (never throws) when the schema isn't applied.
- `getLiveAdStatus(businessId)` returns on-air breaks and plays-today per campaign. It is polled every 10s by the Overview, Campaigns and campaign detail pages via a server action.
- `getAdInventory(viewer)` returns locations/zones/rooms/screens with online status, ads on/off, CPM, availability now (Restricted / Booked / Available), covering campaigns, and a 7-day calendar of booked hours per screen. Uses the pure `lib/business/ad-inventory.ts`.
- Actions:
  - `createCampaign`/`updateCampaign` gain `advertiserName`, `displaySeconds` and `target.screenIds`.
  - New: `deleteCampaign`, `setScreenAdSettings({deviceId, adsEnabled?, cpm?})`, `fetchLiveAdStatus()`.
- `getAdServingReadiness`: schema applied? approved creative? active campaign? online screen? Shown as a checklist on the Overview until everything is green.

## 5. UI (all mock data deleted)

- **Overview:**
  - Readiness checklist (until ready).
  - KPIs (Active campaigns, Plays, Est. views, Est. reach, Est. revenue, Available screens) with trends against the previous period.
  - **On Air Now** live strip.
  - Real 30-day chart (plays / views / reach / revenue).
  - Campaign table with a working actions menu.
  - Top ads, inventory summary, data-derived insights.
- **Campaigns:**
  - Cards show plays/views/reach/revenue and a live "7 / 20 today" counter, plus a working ⋮ menu (View, Edit, Pause/Resume, Archive, Delete).
  - Detail view (deep-linkable via `?campaign=`): live counter and on-air badge, KPIs, daily chart, budget-vs-revenue bar, breakdown by location → room → screen, creative, targeting incl. screens.
- **Wizard:**
  - Advertiser field; image display seconds.
  - A nested Location → Zone → Room → Screen target tree. Selections are unions, and children show "covered by parent".
  - Real projection on the Budget and Review steps.
  - An **edit mode** reusing the same dialog.
- **Performance:** URL-driven filters (range, location, campaign, advertiser), KPIs, trend chart, by-location bars, room and screen tables, weekday × hour heatmap.
- **Inventory:** KPIs (total / available / booked now / utilization), location cards expandable to zones and rooms, a screen table (filters, online status, covering campaigns, inline CPM and ads toggle), and a real 7-day booking calendar.

## Out of scope

- The Analytics and Reports pages' ad sections (they stay on their own engine).
- A cross-business marketplace, billing and payouts.
- Phone ad display (being built by a separate session, consuming `active_ad` / `ads/current` read-only).

## Testing

- `node:test` for the pure modules (`ad-scheduling`, `ad-estimates`, `ad-inventory`): due selection, overnight windows, full vs partial targets, player matching, local-midnight math, estimate formulas, budget caps, projection, availability, booked-hours union.
- `npm run build` + `npm run lint`.
- Live serving can only be exercised after the user applies the SQL file (agents can't run DDL).
