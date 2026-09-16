/**
 * Server-side reads for real Campaigns (supabase/business-advertising.sql +
 * business-ad-serving.sql). Uses the service-role client the same way
 * `lib/business/announcement-queries.ts` does — visibility/ownership is
 * enforced here in app code by always filtering on the caller's own
 * `business_id`. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { listBranches } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { canActOnBranch } from "@/lib/business/viewer";
import { listAdScreens } from "@/lib/business/ad-screens";
import type { BusinessViewer } from "@/lib/business/types";
import {
  campaignObjectiveFromDb,
  campaignStatusFromDb,
  placementTypeFromDb,
  campaignPriorityFromDb,
  type Campaign,
  type CampaignTarget,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";

// ── Target options: every location/zone/room/screen this viewer may target ──

/** Branch-scoped for a manager (only their assigned branches); every branch
 * for the owner/an admin. Rooms and screens carry their parent ids so the
 * wizard can render a tree and estimate delivery client-side. */
export async function getCampaignTargetOptions(viewer: BusinessViewer): Promise<CampaignTargetOptions> {
  const empty: CampaignTargetOptions = { locations: [], zones: [], rooms: [], screens: [] };
  const admin = createAdminClient();
  if (!admin) return empty;

  const branches = (await listBranches(viewer.businessId)).filter((b) => canActOnBranch(viewer, b.id));
  if (!branches.length) return empty;

  const [zonesByBranch, roomsByBranch, screens] = await Promise.all([
    Promise.all(branches.map((b) => listZones(b.id))),
    Promise.all(branches.map((b) => listRooms(b.id))),
    listAdScreens(admin, branches),
  ]);
  const rooms = roomsByBranch.flat();
  const zoneByRoom = new Map(rooms.map((r) => [r.id, r.zoneId]));
  const screenCount = new Map<string, number>();
  for (const s of screens) if (s.roomId) screenCount.set(s.roomId, (screenCount.get(s.roomId) ?? 0) + 1);

  return {
    locations: branches.map((b) => ({ id: b.id, name: b.name, allowsAds: b.allowAds })),
    zones: zonesByBranch.flat().map((z) => ({ id: z.id, name: z.name, branchId: z.branchId })),
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      branchId: r.branchId ?? undefined,
      zoneId: r.zoneId,
      screens: screenCount.get(r.id) ?? 0,
      capacity: r.capacity,
      roomType: r.roomType,
    })),
    screens: screens.map((s) => ({
      id: s.id,
      name: s.name,
      branchId: s.branchId,
      roomId: s.roomId,
      zoneId: s.roomId ? (zoneByRoom.get(s.roomId) ?? null) : null,
      online: s.online,
      adsEnabled: s.adsEnabled,
      cpm: s.cpm,
    })),
  };
}

// ── Campaigns ────────────────────────────────────────────────────────────

interface CampaignRow {
  id: string;
  business_id: string;
  name: string;
  advertiser_name?: string | null;
  objective: string;
  status: string;
  creative_id: string | null;
  display_seconds?: number | null;
  placement_type: string;
  frequency: string | null;
  max_plays_per_day: number | null;
  priority: string;
  budget_type: string;
  budget_amount: number | string | null;
  start_date: string | null;
  end_date: string | null;
  active_start_time: string | null;
  active_end_time: string | null;
  created_at: string;
}

export async function targetsForCampaigns(admin: SupabaseClient, ids: string[]): Promise<Map<string, CampaignTarget>> {
  const targets = new Map<string, CampaignTarget>();
  for (const id of ids) targets.set(id, { locationIds: [], zoneIds: [], roomIds: [], screenIds: [] });
  if (!ids.length) return targets;

  const [{ data: locRows }, { data: zoneRows }, { data: roomRows }, { data: screenRows }] = await Promise.all([
    admin.from("campaign_target_locations").select("campaign_id, branch_id").in("campaign_id", ids),
    admin.from("campaign_target_zones").select("campaign_id, zone_id").in("campaign_id", ids),
    admin.from("campaign_target_rooms").select("campaign_id, room_id").in("campaign_id", ids),
    // Absent until business-ad-serving.sql is applied — `data` is simply null then.
    admin.from("campaign_target_screens").select("campaign_id, device_id").in("campaign_id", ids),
  ]);

  for (const r of (locRows ?? []) as { campaign_id: string; branch_id: string }[]) {
    targets.get(r.campaign_id)?.locationIds.push(r.branch_id);
  }
  for (const r of (zoneRows ?? []) as { campaign_id: string; zone_id: string }[]) {
    targets.get(r.campaign_id)?.zoneIds.push(r.zone_id);
  }
  for (const r of (roomRows ?? []) as { campaign_id: string; room_id: string }[]) {
    targets.get(r.campaign_id)?.roomIds.push(r.room_id);
  }
  for (const r of (screenRows ?? []) as { campaign_id: string; device_id: string }[]) {
    targets.get(r.campaign_id)?.screenIds.push(r.device_id);
  }
  return targets;
}

function rowToCampaign(row: CampaignRow, target: CampaignTarget): Campaign {
  const budget = row.budget_amount == null ? null : Number(row.budget_amount);
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    advertiserName: row.advertiser_name ?? null,
    objective: campaignObjectiveFromDb(row.objective),
    status: campaignStatusFromDb(row.status),
    creativeId: row.creative_id,
    displaySeconds: row.display_seconds ?? null,
    target,
    placementType: placementTypeFromDb(row.placement_type),
    frequencyMinutes: row.frequency,
    maxPlaysPerDay: row.max_plays_per_day,
    priority: campaignPriorityFromDb(row.priority),
    budgetType: row.budget_type === "daily" ? "daily" : "total",
    budgetAmount: budget != null && Number.isFinite(budget) ? budget : null,
    startDate: row.start_date,
    endDate: row.end_date,
    activeStartTime: row.active_start_time ? row.active_start_time.slice(0, 5) : null,
    activeEndTime: row.active_end_time ? row.active_end_time.slice(0, 5) : null,
    createdAt: row.created_at,
  };
}

export async function listCampaigns(businessId: string): Promise<Campaign[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as CampaignRow[];
  if (!rows.length) return [];

  const targets = await targetsForCampaigns(admin, rows.map((r) => r.id));
  return rows.map((r) => rowToCampaign(r, targets.get(r.id)!));
}

export async function getCampaign(businessId: string, id: string): Promise<Campaign | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as CampaignRow;
  const targets = await targetsForCampaigns(admin, [row.id]);
  return rowToCampaign(row, targets.get(row.id)!);
}
