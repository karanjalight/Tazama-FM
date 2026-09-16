"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { canActOnBranch, getBusinessViewer } from "@/lib/business/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getContentItem, type ContentItem } from "@/lib/business/content-queries";
import { insertContentItem } from "@/lib/business/content-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/business/types";
import { AD_SCHEMA_HINT, isMissingSchemaError } from "@/lib/business/ad-screens";
import { AD_WINDOW_RANGES, getAdAnalytics, getLiveAdStatus, type AdAnalytics, type AdWindowRange, type LiveAdStatus } from "@/lib/business/ad-analytics";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_STATUSES,
  PLACEMENT_TYPES,
  campaignObjectiveToDb,
  campaignPriorityToDb,
  campaignStatusToDb,
  placementTypeToDb,
  type CampaignObjective,
  type CampaignPriority,
  type CampaignStatus,
  type CampaignTarget,
  type PlacementType,
} from "@/lib/business/campaign-types";

const AD_LIBRARY_PATH = "/business/advertisements/library";
const CAMPAIGNS_PATH = "/business/advertisements/campaigns";
const ADVERTISEMENTS_OVERVIEW_PATH = "/business/advertisements";
const INVENTORY_PATH = "/business/advertisements/inventory";
const PERFORMANCE_PATH = "/business/advertisements/performance";

function revalidateAdPages() {
  for (const path of [CAMPAIGNS_PATH, ADVERTISEMENTS_OVERVIEW_PATH, INVENTORY_PATH, PERFORMANCE_PATH]) revalidatePath(path);
}

const titleSchema = z.string().trim().min(1, "Give this a title.").max(120);
const contentTypeSchema = z.enum(["video", "image", "audio", "document"]);

// ── Ad creatives — reuses content_items (purpose:"ad_creative"), the same
// real table Content Library uses. Editing/approving/rejecting/deleting an
// ad creative reuses updateContentItem/deleteContentItem from
// app/business/content/actions.ts as-is — those are already purpose-agnostic
// (ownership is checked by business_id, not purpose). Only the initial
// upload needed a purpose-aware sibling. ──

export type UploadAdCreativeResult = { ok: true; item: ContentItem } | { ok: false; error: string };

/** Returns the full real ContentItem (not just ActionResult) — the Create
 * Campaign wizard's inline-upload path needs it immediately, to add the new
 * creative to its own in-session picker list and select it, without waiting
 * on a page-level refetch that a modal shouldn't have to coordinate with. */
export async function uploadAdCreative(formData: FormData): Promise<UploadAdCreativeResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const title = formData.get("title");
  const contentType = formData.get("contentType");
  const file = formData.get("file");
  const durationRaw = formData.get("durationSeconds");
  if (typeof title !== "string" || typeof contentType !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Missing title, type, or file." };
  }
  const durationSeconds =
    typeof durationRaw === "string" && Number.isFinite(Number(durationRaw)) && Number(durationRaw) > 0
      ? Math.round(Number(durationRaw))
      : null;

  const parsedTitle = titleSchema.safeParse(title);
  if (!parsedTitle.success) {
    return { ok: false, error: parsedTitle.error.issues[0]?.message ?? "Invalid title." };
  }
  const parsedType = contentTypeSchema.safeParse(contentType);
  if (!parsedType.success) {
    return { ok: false, error: "Invalid content type." };
  }

  const profile = await getCurrentProfile();
  const result = await insertContentItem({
    businessId: viewer.businessId,
    uploadedBy: profile?.id ?? null,
    title: parsedTitle.data,
    contentType: parsedType.data,
    purpose: "ad_creative",
    file,
    durationSeconds,
  });
  if (!result.ok) return result;

  const item = await getContentItem(viewer.businessId, result.id);
  if (!item) return { ok: false, error: "Uploaded, but could not load the new creative." };

  revalidatePath(AD_LIBRARY_PATH);
  return { ok: true, item };
}

/** Duplicates an ad creative's `content_items` row without re-uploading —
 * points the new row at the SAME storage_path, same reasoning Announcements'
 * "Duplicate" already established (`cleanupAudioIfUnreferenced` checks
 * whether any other row still references a path before removing it; content
 * items don't have that reference-count cleanup at all, so a duplicated
 * creative's file simply outlives either row independently — no dangling
 * reference risk since nothing here ever deletes it out from under the
 * other). A fresh row always starts back at "pending" review, same as any
 * new upload. */
export async function duplicateAdCreative(input: { businessId: string; id: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const item = await getContentItem(viewer.businessId, input.id);
  if (!item) return { ok: false, error: "Creative not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const profile = await getCurrentProfile();
  const { error } = await admin.from("content_items").insert({
    business_id: viewer.businessId,
    title: `${item.title} (Copy)`,
    content_type: item.contentType,
    purpose: "ad_creative",
    format: item.format,
    storage_path: item.storagePath,
    size_bytes: item.sizeBytes,
    duration_seconds: item.durationSeconds,
    status: "pending",
    uploaded_by: profile?.id ?? null,
  });
  if (error) {
    console.error("duplicateAdCreative: insert failed", error);
    return { ok: false, error: "Could not duplicate the creative." };
  }

  revalidatePath(AD_LIBRARY_PATH);
  return { ok: true };
}

// ── Campaigns ────────────────────────────────────────────────────────────

const uuidArraySchema = z.array(z.string().uuid());
const campaignTargetSchema = z.object({
  locationIds: uuidArraySchema,
  zoneIds: uuidArraySchema,
  roomIds: uuidArraySchema,
  screenIds: uuidArraySchema.default([]),
});

const nameSchema = z.string().trim().min(1, "Give this campaign a name.").max(120);
const advertiserSchema = z.string().trim().max(120).nullable().transform((v) => (v ? v : null));
const displaySecondsSchema = z.number().int().min(3, "Show an image ad for at least 3 seconds.").max(300).nullable();
const frequencyMinutesSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Frequency must be a whole number of minutes.")
  .nullable();
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .nullable();
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.")
  .nullable();

const createCampaignSchema = z.object({
  businessId: z.string().uuid(),
  name: nameSchema,
  advertiserName: advertiserSchema,
  objective: z.enum(CAMPAIGN_OBJECTIVES as unknown as [CampaignObjective, ...CampaignObjective[]]),
  creativeId: z.string().uuid().nullable(),
  displaySeconds: displaySecondsSchema,
  target: campaignTargetSchema,
  placementType: z.enum(PLACEMENT_TYPES as unknown as [PlacementType, ...PlacementType[]]),
  frequencyMinutes: frequencyMinutesSchema,
  maxPlaysPerDay: z.number().int().min(1).max(10_000).nullable(),
  priority: z.enum(CAMPAIGN_PRIORITIES as unknown as [CampaignPriority, ...CampaignPriority[]]),
  budgetType: z.enum(["total", "daily"]),
  budgetAmount: z.number().min(0).nullable(),
  startDate: dateSchema,
  endDate: dateSchema,
  activeStartTime: timeSchema,
  activeEndTime: timeSchema,
  status: z.enum(["Active", "Draft"]).optional(),
});

/** Every target id must belong to a location this viewer may act on — a
 * forged id from another business (or a manager's unassigned branch) is
 * rejected rather than silently written. */
async function targetIsWithinViewerScope(
  admin: SupabaseClient,
  viewer: NonNullable<Awaited<ReturnType<typeof getBusinessViewer>>>,
  target: CampaignTarget,
): Promise<boolean> {
  const branchIds = new Set<string>(target.locationIds);
  const lookups: PromiseLike<{ data: unknown }>[] = [];
  if (target.zoneIds.length) lookups.push(admin.from("zones").select("branch_id").in("id", target.zoneIds));
  if (target.roomIds.length) lookups.push(admin.from("rooms").select("branch_id").in("id", target.roomIds));
  if (target.screenIds.length) lookups.push(admin.from("branch_devices").select("branch_id").in("id", target.screenIds));
  const results = await Promise.all(lookups);
  const expected = target.zoneIds.length + target.roomIds.length + target.screenIds.length;
  let found = 0;
  for (const res of results) {
    for (const row of (res.data ?? []) as { branch_id: string | null }[]) {
      found += 1;
      if (!row.branch_id) return false;
      branchIds.add(row.branch_id);
    }
  }
  if (found !== expected) return false;
  if (!branchIds.size) return true;

  const { data: branches } = await admin.from("branches").select("id, business_id").in("id", [...branchIds]);
  const rows = (branches ?? []) as { id: string; business_id: string }[];
  return rows.length === branchIds.size && rows.every((b) => b.business_id === viewer.businessId && canActOnBranch(viewer, b.id));
}

async function writeCampaignTargetRows(
  admin: SupabaseClient,
  campaignId: string,
  target: CampaignTarget,
): Promise<boolean> {
  const inserts: PromiseLike<{ error: unknown }>[] = [];
  if (target.locationIds.length) {
    inserts.push(
      admin
        .from("campaign_target_locations")
        .insert(target.locationIds.map((branch_id) => ({ campaign_id: campaignId, branch_id }))),
    );
  }
  if (target.zoneIds.length) {
    inserts.push(
      admin.from("campaign_target_zones").insert(target.zoneIds.map((zone_id) => ({ campaign_id: campaignId, zone_id }))),
    );
  }
  if (target.roomIds.length) {
    inserts.push(
      admin.from("campaign_target_rooms").insert(target.roomIds.map((room_id) => ({ campaign_id: campaignId, room_id }))),
    );
  }
  if (target.screenIds.length) {
    inserts.push(
      admin
        .from("campaign_target_screens")
        .insert(target.screenIds.map((device_id) => ({ campaign_id: campaignId, device_id }))),
    );
  }
  const results = await Promise.all(inserts);
  return results.every((r) => !r.error);
}

async function clearCampaignTargetRows(admin: SupabaseClient, campaignId: string): Promise<void> {
  await Promise.all([
    admin.from("campaign_target_locations").delete().eq("campaign_id", campaignId),
    admin.from("campaign_target_zones").delete().eq("campaign_id", campaignId),
    admin.from("campaign_target_rooms").delete().eq("campaign_id", campaignId),
    admin.from("campaign_target_screens").delete().eq("campaign_id", campaignId),
  ]);
}

export type CreateCampaignResult = { ok: true; campaignId: string } | { ok: false; error: string };

export interface CampaignInput {
  businessId: string;
  name: string;
  advertiserName: string | null;
  objective: CampaignObjective;
  creativeId: string | null;
  displaySeconds: number | null;
  target: CampaignTarget;
  placementType: PlacementType;
  frequencyMinutes: string | null;
  maxPlaysPerDay: number | null;
  priority: CampaignPriority;
  budgetType: "total" | "daily";
  budgetAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  activeStartTime: string | null;
  activeEndTime: string | null;
  /** "Draft" saves without airing (and without requiring a target yet). */
  status?: "Active" | "Draft";
}

function hasTarget(target: CampaignTarget): boolean {
  return !!(target.locationIds.length || target.zoneIds.length || target.roomIds.length || target.screenIds.length);
}

/** Columns added by business-ad-serving.sql — dropped (with a clear error if
 * they carried meaningful values) when that file hasn't been applied yet, so
 * plain campaigns keep working on an older database. */
const SERVING_COLUMNS = ["advertiser_name", "display_seconds"] as const;

/** New campaigns start `active` (or `draft` when saved as one) — dates and
 * active hours decide when an active one actually airs (the UI shows a
 * future-dated one as "Scheduled"). */
export async function createCampaign(input: CampaignInput): Promise<CreateCampaignResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  if (input.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid campaign details." };
  }
  const { target, status, ...fields } = parsed.data;
  const isDraft = status === "Draft";
  if (!isDraft && !hasTarget(target)) {
    return { ok: false, error: "Select at least one location, zone, room, or screen to target." };
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return { ok: false, error: "The end date can't be before the start date." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };
  if (!(await targetIsWithinViewerScope(admin, viewer, target))) {
    return { ok: false, error: "One of the selected targets isn't available to you." };
  }

  const row: Record<string, unknown> = {
    business_id: viewer.businessId,
    name: fields.name,
    advertiser_name: fields.advertiserName,
    objective: campaignObjectiveToDb(fields.objective),
    status: isDraft ? "draft" : "active",
    creative_id: fields.creativeId,
    display_seconds: fields.displaySeconds,
    placement_type: placementTypeToDb(fields.placementType),
    frequency: fields.frequencyMinutes,
    max_plays_per_day: fields.maxPlaysPerDay,
    priority: campaignPriorityToDb(fields.priority),
    budget_type: fields.budgetType,
    budget_amount: fields.budgetAmount,
    start_date: fields.startDate,
    end_date: fields.endDate,
    active_start_time: fields.activeStartTime,
    active_end_time: fields.activeEndTime,
  };

  let result = await admin.from("campaigns").insert(row).select("id").single();
  if (result.error && isMissingSchemaError(result.error)) {
    if (target.screenIds.length) return { ok: false, error: `Screen targeting isn't set up yet. ${AD_SCHEMA_HINT}` };
    for (const column of SERVING_COLUMNS) delete row[column];
    result = await admin.from("campaigns").insert(row).select("id").single();
  }
  const { data: inserted, error } = result;
  if (error || !inserted) {
    console.error("createCampaign: insert failed", error);
    return { ok: false, error: "Could not create the campaign." };
  }

  const targetOk = await writeCampaignTargetRows(admin, inserted.id as string, target);
  if (!targetOk) {
    await admin.from("campaigns").delete().eq("id", inserted.id);
    return { ok: false, error: "Could not save the campaign's targeting." };
  }

  revalidateAdPages();
  return { ok: true, campaignId: inserted.id as string };
}

const updateCampaignSchema = createCampaignSchema.partial().extend({
  businessId: z.string().uuid(),
  campaignId: z.string().uuid(),
});

export async function updateCampaign(
  input: Partial<Omit<CampaignInput, "businessId">> & { businessId: string; campaignId: string },
): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  if (input.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }
  const { campaignId, target, status: _status, ...fields } = parsed.data;
  void _status; // status changes go through setCampaignStatus
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return { ok: false, error: "The end date can't be before the start date." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: existing } = await admin
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("business_id", viewer.businessId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Campaign not found." };

  if (target) {
    if (!hasTarget(target)) {
      return { ok: false, error: "Select at least one location, zone, room, or screen to target." };
    }
    if (!(await targetIsWithinViewerScope(admin, viewer, target))) {
      return { ok: false, error: "One of the selected targets isn't available to you." };
    }
  }

  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.advertiserName !== undefined) patch.advertiser_name = fields.advertiserName;
  if (fields.objective !== undefined) patch.objective = campaignObjectiveToDb(fields.objective);
  if (fields.creativeId !== undefined) patch.creative_id = fields.creativeId;
  if (fields.displaySeconds !== undefined) patch.display_seconds = fields.displaySeconds;
  if (fields.placementType !== undefined) patch.placement_type = placementTypeToDb(fields.placementType);
  if (fields.frequencyMinutes !== undefined) patch.frequency = fields.frequencyMinutes;
  if (fields.maxPlaysPerDay !== undefined) patch.max_plays_per_day = fields.maxPlaysPerDay;
  if (fields.priority !== undefined) patch.priority = campaignPriorityToDb(fields.priority);
  if (fields.budgetType !== undefined) patch.budget_type = fields.budgetType;
  if (fields.budgetAmount !== undefined) patch.budget_amount = fields.budgetAmount;
  if (fields.startDate !== undefined) patch.start_date = fields.startDate;
  if (fields.endDate !== undefined) patch.end_date = fields.endDate;
  if (fields.activeStartTime !== undefined) patch.active_start_time = fields.activeStartTime;
  if (fields.activeEndTime !== undefined) patch.active_end_time = fields.activeEndTime;

  if (Object.keys(patch).length > 0) {
    let { error } = await admin.from("campaigns").update(patch).eq("id", campaignId).eq("business_id", viewer.businessId);
    if (error && isMissingSchemaError(error)) {
      for (const column of SERVING_COLUMNS) delete patch[column];
      ({ error } = Object.keys(patch).length
        ? await admin.from("campaigns").update(patch).eq("id", campaignId).eq("business_id", viewer.businessId)
        : { error: null });
    }
    if (error) {
      console.error("updateCampaign: update failed", error);
      return { ok: false, error: "Could not update the campaign." };
    }
  }

  if (target) {
    if (target.screenIds.length) {
      const { error } = await admin.from("campaign_target_screens").select("campaign_id").limit(1);
      if (error) return { ok: false, error: `Screen targeting isn't set up yet. ${AD_SCHEMA_HINT}` };
    }
    await clearCampaignTargetRows(admin, campaignId);
    const targetOk = await writeCampaignTargetRows(admin, campaignId, target);
    if (!targetOk) return { ok: false, error: "Could not save the campaign's targeting." };
  }

  revalidateAdPages();
  return { ok: true };
}

/** Covers Pause/Resume/Archive/Complete — one generic status setter rather
 * than a function per transition, since every one of them is the same
 * single-column update. */
export async function setCampaignStatus(input: {
  businessId: string;
  campaignId: string;
  status: CampaignStatus;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  if (input.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }
  if (!CAMPAIGN_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("campaigns")
    .update({ status: campaignStatusToDb(input.status) })
    .eq("id", input.campaignId)
    .eq("business_id", viewer.businessId);
  if (error) {
    console.error("setCampaignStatus: update failed", error);
    return { ok: false, error: "Could not update the campaign's status." };
  }

  revalidateAdPages();
  return { ok: true };
}

/** Deletes a campaign and, via cascades, its targeting, airings and their
 * play events — Archive is the way to stop a campaign but keep its numbers. */
export async function deleteCampaign(input: { businessId: string; campaignId: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  if (input.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }
  if (viewer.role === "manager") {
    return { ok: false, error: "Only an owner or admin can delete campaigns. Archive it instead." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data, error } = await admin
    .from("campaigns")
    .delete()
    .eq("id", input.campaignId)
    .eq("business_id", viewer.businessId)
    .select("id");
  if (error) {
    console.error("deleteCampaign: delete failed", error);
    return { ok: false, error: "Could not delete the campaign." };
  }
  if (!data?.length) return { ok: false, error: "Campaign not found." };

  revalidateAdPages();
  return { ok: true };
}

// ── Screens as ad inventory ──────────────────────────────────────────────

const screenSettingsSchema = z.object({
  businessId: z.string().uuid(),
  deviceId: z.string().uuid(),
  adsEnabled: z.boolean().optional(),
  cpm: z.number().min(0, "CPM can't be negative.").max(1_000_000).nullable().optional(),
});

/** Ads on/off and the CPM rate for one screen (Ad Inventory page). */
export async function setScreenAdSettings(input: {
  businessId: string;
  deviceId: string;
  adsEnabled?: boolean;
  cpm?: number | null;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  if (input.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }
  const parsed = screenSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: device } = await admin.from("branch_devices").select("id, branch_id").eq("id", parsed.data.deviceId).maybeSingle();
  const deviceRow = device as { id: string; branch_id: string } | null;
  if (!deviceRow) return { ok: false, error: "Screen not found." };
  const { data: branch } = await admin.from("branches").select("business_id").eq("id", deviceRow.branch_id).maybeSingle();
  if ((branch as { business_id: string } | null)?.business_id !== viewer.businessId || !canActOnBranch(viewer, deviceRow.branch_id)) {
    return { ok: false, error: "You don't have access to this screen." };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.adsEnabled !== undefined) patch.ads_enabled = parsed.data.adsEnabled;
  if (parsed.data.cpm !== undefined) patch.ad_cpm = parsed.data.cpm;
  if (!Object.keys(patch).length) return { ok: true };

  const { error } = await admin.from("branch_devices").update(patch).eq("id", deviceRow.id);
  if (error) {
    if (isMissingSchemaError(error)) return { ok: false, error: `Screen ad settings aren't set up yet. ${AD_SCHEMA_HINT}` };
    console.error("setScreenAdSettings: update failed", error);
    return { ok: false, error: "Could not save the screen's ad settings." };
  }

  revalidateAdPages();
  return { ok: true };
}

// ── Live counters ────────────────────────────────────────────────────────

/** Polled by the Overview/Campaigns pages (~10s) for the On Air strip and
 * the live "plays today" counters. */
export async function fetchLiveAdStatus(): Promise<LiveAdStatus | null> {
  const viewer = await getBusinessViewer();
  if (!viewer) return null;
  return getLiveAdStatus(viewer);
}

/** Real ad analytics for a dashboard date range — used by the Analytics and
 * Reports pages' advertising sections, which filter client-side. */
export async function fetchAdAnalytics(range: string): Promise<AdAnalytics | null> {
  const viewer = await getBusinessViewer();
  if (!viewer) return null;
  const safeRange: AdWindowRange = (AD_WINDOW_RANGES as readonly string[]).includes(range) ? (range as AdWindowRange) : "Last 30 days";
  return getAdAnalytics(viewer, { range: safeRange });
}
