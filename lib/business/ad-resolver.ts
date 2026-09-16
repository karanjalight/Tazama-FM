/**
 * "Which campaign should air for this player right now?" — resolved fresh on
 * every tick over current DB state (never trusted from a prior response).
 * SERVER ONLY. The pure rules live in lib/business/ad-scheduling.ts; this file
 * only gathers the rows they need.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getContentItem, type ContentItem } from "@/lib/business/content-queries";
import { isMissingSchemaError } from "@/lib/business/ad-screens";
import {
  isWithinCampaignWindow,
  localDateParts,
  parseFrequencyMinutes,
  rankDueCampaigns,
  startOfLocalDayMs,
  type SourceHistory,
} from "@/lib/business/ad-scheduling";
import type { PlaybackSource } from "@/lib/business/ad-playback";

export interface ResolvedPlayer {
  roomId: string;
  zoneId: string | null;
  branchId: string;
  businessId: string;
  timezone: string;
  locationAllowsAds: boolean;
  /** `branch_devices.id` of a paired screen, null for an unpaired browser. */
  deviceId: string | null;
  deviceAdsEnabled: boolean;
}

/** The room (and, if the token matches a screen of the same business, the
 * device) a kiosk is playing as. Null for a room that isn't a business room. */
export async function resolvePlayer(
  admin: SupabaseClient,
  roomId: string,
  deviceToken: string | null,
): Promise<ResolvedPlayer | null> {
  const { data: room } = await admin.from("rooms").select("id, branch_id, zone_id").eq("id", roomId).maybeSingle();
  const roomRow = room as { id: string; branch_id: string | null; zone_id: string | null } | null;
  if (!roomRow?.branch_id) return null;

  const { data: branch } = await admin
    .from("branches")
    .select("id, business_id, allow_ads, timezone")
    .eq("id", roomRow.branch_id)
    .maybeSingle();
  const branchRow = branch as { id: string; business_id: string; allow_ads: boolean | null; timezone: string | null } | null;
  if (!branchRow) return null;

  let deviceId: string | null = null;
  let deviceAdsEnabled = true;
  if (deviceToken) {
    type DeviceRow = { id: string; branch_id: string; ads_enabled?: boolean | null };
    const withAdColumns = await admin
      .from("branch_devices")
      .select("id, branch_id, ads_enabled")
      .eq("device_token", deviceToken)
      .maybeSingle();
    let deviceRow = withAdColumns.data as DeviceRow | null;
    if (withAdColumns.error && isMissingSchemaError(withAdColumns.error)) {
      const plain = await admin.from("branch_devices").select("id, branch_id").eq("device_token", deviceToken).maybeSingle();
      deviceRow = plain.data as DeviceRow | null;
    }
    if (deviceRow) {
      const { data: deviceBranch } = await admin.from("branches").select("business_id").eq("id", deviceRow.branch_id).maybeSingle();
      if ((deviceBranch as { business_id: string } | null)?.business_id === branchRow.business_id) {
        deviceId = deviceRow.id;
        deviceAdsEnabled = deviceRow.ads_enabled ?? true;
      }
    }
  }

  return {
    roomId,
    zoneId: roomRow.zone_id,
    branchId: branchRow.id,
    businessId: branchRow.business_id,
    timezone: branchRow.timezone || "Africa/Nairobi",
    locationAllowsAds: branchRow.allow_ads ?? true,
    deviceId,
    deviceAdsEnabled,
  };
}

export interface DueCampaign {
  id: string;
  name: string;
  advertiserName: string | null;
  frequencyMinutes: number | null;
  displaySeconds: number | null;
  creative: ContentItem;
}

interface CampaignCandidateRow {
  id: string;
  name: string;
  business_id: string;
  advertiser_name?: string | null;
  creative_id: string | null;
  display_seconds?: number | null;
  frequency: string | null;
  max_plays_per_day: number | null;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  active_start_time: string | null;
  active_end_time: string | null;
}

export async function findDueCampaign(
  admin: SupabaseClient,
  player: ResolvedPlayer,
  source: PlaybackSource,
  now: Date,
): Promise<DueCampaign | null> {
  const none = Promise.resolve({ data: [] as { campaign_id: string }[] });
  const [byRoom, byZone, byLocation, byScreen] = await Promise.all([
    admin.from("campaign_target_rooms").select("campaign_id").eq("room_id", player.roomId),
    player.zoneId ? admin.from("campaign_target_zones").select("campaign_id").eq("zone_id", player.zoneId) : none,
    admin.from("campaign_target_locations").select("campaign_id").eq("branch_id", player.branchId),
    player.deviceId ? admin.from("campaign_target_screens").select("campaign_id").eq("device_id", player.deviceId) : none,
  ]);
  const ids = new Set<string>();
  for (const res of [byRoom, byZone, byLocation, byScreen]) {
    for (const r of (res.data ?? []) as { campaign_id: string }[]) ids.add(r.campaign_id);
  }
  if (!ids.size) return null;

  const { data } = await admin
    .from("campaigns")
    .select("*")
    .in("id", [...ids])
    .eq("business_id", player.businessId)
    .eq("status", "active");
  const local = localDateParts(player.timezone, now);
  const live = ((data ?? []) as CampaignCandidateRow[]).filter((c) =>
    isWithinCampaignWindow(
      { startDate: c.start_date, endDate: c.end_date, activeStartTime: c.active_start_time, activeEndTime: c.active_end_time },
      local,
    ),
  );
  if (!live.length) return null;

  // Cadence and daily caps are counted per playback SOURCE: every room on a
  // synchronized zone/schedule shares its airings.
  const dayStart = startOfLocalDayMs(player.timezone, now);
  const lookback = Math.min(dayStart, now.getTime() - 24 * 60 * 60_000);
  const { data: breakRows } = await admin
    .from("ad_breaks")
    .select("campaign_id, started_at")
    .eq("source_kind", source.kind)
    .eq("source_id", source.id)
    .in(
      "campaign_id",
      live.map((c) => c.id),
    )
    .gte("started_at", new Date(lookback).toISOString())
    .order("started_at", { ascending: false });

  const history = new Map<string, SourceHistory>();
  for (const row of (breakRows ?? []) as { campaign_id: string; started_at: string }[]) {
    const startedMs = Date.parse(row.started_at);
    const h = history.get(row.campaign_id) ?? { lastStartedAtMs: null, todayCount: 0 };
    if (h.lastStartedAtMs == null || startedMs > h.lastStartedAtMs) h.lastStartedAtMs = startedMs;
    if (startedMs >= dayStart) h.todayCount += 1;
    history.set(row.campaign_id, h);
  }

  const ranked = rankDueCampaigns(
    live.map((c) => ({
      ...c,
      frequencyMinutes: parseFrequencyMinutes(c.frequency),
      maxPlaysPerDay: c.max_plays_per_day,
    })),
    history,
    now.getTime(),
  );

  for (const candidate of ranked) {
    if (!candidate.creative_id) continue;
    const creative = await getContentItem(player.businessId, candidate.creative_id);
    if (!creative || creative.status !== "approved") continue; // an unapproved creative never airs
    return {
      id: candidate.id,
      name: candidate.name,
      advertiserName: candidate.advertiser_name ?? null,
      frequencyMinutes: candidate.frequencyMinutes,
      displaySeconds: candidate.display_seconds ?? null,
      creative,
    };
  }
  return null;
}
