"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/business/types";

/**
 * Only the owner or an 'admin' may change business-wide settings/billing/
 * integrations (not managers) — these are business-wide, not branch-scoped,
 * so the check is this instead of `canActOnBranch`. Duplicated from
 * `app/business/actions.ts` rather than imported: per-slice `actions.ts`
 * files are deliberately separate so Round 1's slices build with zero file
 * collisions (see the plan's "Resolved decisions" #1).
 */
function requireAdminLevel(
  viewer: Awaited<ReturnType<typeof getBusinessViewer>>,
): viewer is NonNullable<typeof viewer> & { role: "owner" | "admin" } {
  return !!viewer && (viewer.role === "owner" || viewer.role === "admin");
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.");

const settingsSchema = z.object({
  businessId: z.string().uuid(),
  // business_profiles fields (not on business_settings — see the schema's
  // header comment), saved together since they're on the same form/card.
  businessName: z.string().trim().min(2, "Enter a business name.").max(60),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(20),
  // business_settings fields
  businessType: z.string().trim().max(60),
  description: z.string().trim().max(2000),
  email: z.string().trim().max(200),
  website: z.string().trim().max(200),
  country: z.string().trim().max(60),
  county: z.string().trim().max(60),
  city: z.string().trim().max(60),
  address: z.string().trim().max(200),
  postalCode: z.string().trim().max(20),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  contentStyle: z.enum(["brand_focused", "modern", "minimal"]),
  defaultVolume: z.number().int().min(0).max(100),
  announcementBehavior: z.enum(["reduce_volume", "pause_music"]),
  contentTransition: z.enum(["fade", "cut", "slide", "zoom"]),
  timezone: z.string().trim().min(1).max(60),
  notifyScreenOffline: z.boolean(),
  notifyCampaignPerformance: z.boolean(),
  notifyWeeklyReports: z.boolean(),
  notifyBilling: z.boolean(),
  pushCriticalDeviceAlerts: z.boolean(),
  pushDailySummary: z.boolean(),
  audienceInsightsEnabled: z.boolean(),
  analyticsRetentionDays: z.number().int().positive().max(3650),
});

export async function updateBusinessSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to change business settings." };
  }
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }
  if (parsed.data.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured (missing service-role key)." };

  const { error: profileError } = await admin
    .from("business_profiles")
    .update({
      business_name: parsed.data.businessName,
      business_phone: parsed.data.phone,
    })
    .eq("id", viewer.businessId);
  if (profileError) {
    console.error("updateBusinessSettings: business_profiles update failed", profileError);
    return { ok: false, error: "Could not save business profile." };
  }

  const { error: settingsError } = await admin.from("business_settings").upsert(
    {
      business_id: viewer.businessId,
      business_type: parsed.data.businessType,
      description: parsed.data.description,
      email: parsed.data.email,
      website: parsed.data.website,
      country: parsed.data.country,
      county: parsed.data.county,
      city: parsed.data.city,
      address: parsed.data.address,
      postal_code: parsed.data.postalCode,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      content_style: parsed.data.contentStyle,
      default_volume: parsed.data.defaultVolume,
      announcement_behavior: parsed.data.announcementBehavior,
      content_transition: parsed.data.contentTransition,
      timezone: parsed.data.timezone,
      notify_screen_offline: parsed.data.notifyScreenOffline,
      notify_campaign_performance: parsed.data.notifyCampaignPerformance,
      notify_weekly_reports: parsed.data.notifyWeeklyReports,
      notify_billing: parsed.data.notifyBilling,
      push_critical_device_alerts: parsed.data.pushCriticalDeviceAlerts,
      push_daily_summary: parsed.data.pushDailySummary,
      audience_insights_enabled: parsed.data.audienceInsightsEnabled,
      analytics_retention_days: parsed.data.analyticsRetentionDays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (settingsError) {
    console.error("updateBusinessSettings: business_settings upsert failed", settingsError);
    return { ok: false, error: "Could not save business settings." };
  }

  revalidatePath("/business/settings/business");
  return { ok: true };
}

const hoursSchema = z.object({
  businessId: z.string().uuid(),
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time."),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time."),
        isOpen: z.boolean(),
      }),
    )
    .length(7, "Expected all 7 days."),
});

export async function updateBusinessHours(
  input: z.infer<typeof hoursSchema>,
): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to change business hours." };
  }
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid hours." };
  }
  if (parsed.data.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const rows = parsed.data.hours.map((h) => ({
    business_id: viewer.businessId,
    day_of_week: h.dayOfWeek,
    open_time: `${h.openTime}:00`,
    close_time: `${h.closeTime}:00`,
    is_open: h.isOpen,
  }));

  const { error } = await admin
    .from("business_hours")
    .upsert(rows, { onConflict: "business_id,day_of_week" });
  if (error) {
    console.error("updateBusinessHours: upsert failed", error);
    return { ok: false, error: "Could not save business hours." };
  }

  revalidatePath("/business/settings/business");
  return { ok: true };
}

const connectSchema = z.object({
  businessId: z.string().uuid(),
  integrationKey: z.string().trim().min(1).max(60),
  accountLabel: z.string().trim().min(1, "Enter an account label.").max(120),
});

/**
 * Stub connect — no real OAuth for any provider (deliberate, approved scope
 * decision; see the plan's "Resolved decisions" #2). Just records the
 * account label the user typed and a `connected_at` timestamp.
 */
export async function connectIntegration(
  input: z.infer<typeof connectSchema>,
): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to manage integrations." };
  }
  const parsed = connectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  if (parsed.data.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: catalogRow } = await admin
    .from("integration_catalog")
    .select("key, availability")
    .eq("key", parsed.data.integrationKey)
    .maybeSingle();
  if (!catalogRow) return { ok: false, error: "Unknown integration." };
  if (catalogRow.availability !== "available") {
    return { ok: false, error: "This integration isn't available yet." };
  }

  const { error } = await admin.from("business_integrations").insert({
    business_id: viewer.businessId,
    integration_key: parsed.data.integrationKey,
    account_label: parsed.data.accountLabel,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That integration is already connected." };
    }
    console.error("connectIntegration: insert failed", error);
    return { ok: false, error: "Could not connect that integration." };
  }

  revalidatePath("/business/settings/integrations");
  return { ok: true };
}

const disconnectSchema = z.object({
  businessId: z.string().uuid(),
  integrationKey: z.string().trim().min(1).max(60),
});

export async function disconnectIntegration(
  input: z.infer<typeof disconnectSchema>,
): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to manage integrations." };
  }
  const parsed = disconnectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid details." };
  }
  if (parsed.data.businessId !== viewer.businessId) {
    return { ok: false, error: "You don't have access to this business." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("business_integrations")
    .delete()
    .eq("business_id", viewer.businessId)
    .eq("integration_key", parsed.data.integrationKey);
  if (error) {
    console.error("disconnectIntegration: delete failed", error);
    return { ok: false, error: "Could not disconnect that integration." };
  }

  revalidatePath("/business/settings/integrations");
  return { ok: true };
}
