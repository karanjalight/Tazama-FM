/**
 * Server-side reads for Business Settings, Integrations and read-only
 * Billing. Same convention as `lib/business/queries.ts` — service-role
 * client, visibility enforced in app code by always filtering on the
 * caller's own `business_id`. SERVER ONLY.
 *
 * Every getter degrades to a sensible default shape on failure/missing rows
 * instead of `null` — every business should always have "some" settings,
 * hours, integrations list and billing summary to render, even before its
 * `business_settings`/`business_subscriptions` row exists (rows are created
 * lazily on first save; `plan_limits`/`integration_catalog` are seeded by
 * the migration itself).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { listBranches } from "@/lib/business/queries";

// ── Business Settings ────────────────────────────────────────────────────

export interface BusinessSettings {
  businessType: string;
  description: string;
  email: string;
  website: string;
  logoPath: string | null;
  country: string;
  county: string;
  city: string;
  address: string;
  postalCode: string;
  primaryColor: string;
  secondaryColor: string;
  contentStyle: "brand_focused" | "modern" | "minimal";
  defaultVolume: number;
  announcementBehavior: "reduce_volume" | "pause_music";
  contentTransition: "fade" | "cut" | "slide" | "zoom";
  timezone: string;
  notifyScreenOffline: boolean;
  notifyCampaignPerformance: boolean;
  notifyWeeklyReports: boolean;
  notifyBilling: boolean;
  pushCriticalDeviceAlerts: boolean;
  pushDailySummary: boolean;
  audienceInsightsEnabled: boolean;
  analyticsRetentionDays: number;
}

/**
 * Defaults for a business with no `business_settings` row yet. `timezone`,
 * the notification bools, and `analyticsRetentionDays` mirror the schema's
 * own `default` clauses (see supabase/business-settings.sql). The rest of
 * the schema's columns have no DB default (free text / nullable enums) —
 * those default to "" / a neutral first choice here purely so the UI never
 * has to render `undefined`, not because the schema implies them.
 */
function defaultBusinessSettings(): BusinessSettings {
  return {
    businessType: "",
    description: "",
    email: "",
    website: "",
    logoPath: null,
    country: "",
    county: "",
    city: "",
    address: "",
    postalCode: "",
    primaryColor: "#dc2626",
    secondaryColor: "#0a0a0a",
    contentStyle: "modern",
    defaultVolume: 70,
    announcementBehavior: "reduce_volume",
    contentTransition: "fade",
    timezone: "Africa/Nairobi",
    notifyScreenOffline: true,
    notifyCampaignPerformance: true,
    notifyWeeklyReports: true,
    notifyBilling: true,
    pushCriticalDeviceAlerts: true,
    pushDailySummary: false,
    audienceInsightsEnabled: true,
    analyticsRetentionDays: 90,
  };
}

interface BusinessSettingsRow {
  business_type: string | null;
  description: string | null;
  email: string | null;
  website: string | null;
  logo_path: string | null;
  country: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  content_style: BusinessSettings["contentStyle"] | null;
  default_volume: number | null;
  announcement_behavior: BusinessSettings["announcementBehavior"] | null;
  content_transition: BusinessSettings["contentTransition"] | null;
  timezone: string;
  notify_screen_offline: boolean;
  notify_campaign_performance: boolean;
  notify_weekly_reports: boolean;
  notify_billing: boolean;
  push_critical_device_alerts: boolean;
  push_daily_summary: boolean;
  audience_insights_enabled: boolean;
  analytics_retention_days: number;
}

function rowToBusinessSettings(row: BusinessSettingsRow): BusinessSettings {
  const fallback = defaultBusinessSettings();
  return {
    businessType: row.business_type ?? fallback.businessType,
    description: row.description ?? fallback.description,
    email: row.email ?? fallback.email,
    website: row.website ?? fallback.website,
    logoPath: row.logo_path,
    country: row.country ?? fallback.country,
    county: row.county ?? fallback.county,
    city: row.city ?? fallback.city,
    address: row.address ?? fallback.address,
    postalCode: row.postal_code ?? fallback.postalCode,
    primaryColor: row.primary_color ?? fallback.primaryColor,
    secondaryColor: row.secondary_color ?? fallback.secondaryColor,
    contentStyle: row.content_style ?? fallback.contentStyle,
    defaultVolume: row.default_volume ?? fallback.defaultVolume,
    announcementBehavior: row.announcement_behavior ?? fallback.announcementBehavior,
    contentTransition: row.content_transition ?? fallback.contentTransition,
    timezone: row.timezone,
    notifyScreenOffline: row.notify_screen_offline,
    notifyCampaignPerformance: row.notify_campaign_performance,
    notifyWeeklyReports: row.notify_weekly_reports,
    notifyBilling: row.notify_billing,
    pushCriticalDeviceAlerts: row.push_critical_device_alerts,
    pushDailySummary: row.push_daily_summary,
    audienceInsightsEnabled: row.audience_insights_enabled,
    analyticsRetentionDays: row.analytics_retention_days,
  };
}

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const admin = createAdminClient();
  if (!admin) return defaultBusinessSettings();
  const { data } = await admin
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return data ? rowToBusinessSettings(data as BusinessSettingsRow) : defaultBusinessSettings();
}

/**
 * `business_name`/`business_phone` live on `business_profiles`, not
 * `business_settings` (see the schema file's header comment) — the Business
 * Profile card needs the phone number alongside the rest of its fields, and
 * `getBusinessViewer()` doesn't fetch it, so this is a small dedicated read.
 */
export async function getBusinessPhone(businessId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "";
  const { data } = await admin
    .from("business_profiles")
    .select("business_phone")
    .eq("id", businessId)
    .maybeSingle();
  return (data?.business_phone as string | undefined) ?? "";
}

// ── Business Hours ───────────────────────────────────────────────────────

export interface BusinessHours {
  dayOfWeek: number; // 0 = Monday .. 6 = Sunday
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  isOpen: boolean;
}

/** Matches the defaults already used by the mock UI's `createDefaultHours()`. */
const DEFAULT_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "22:00", isOpen: true }, // Monday
  { dayOfWeek: 1, openTime: "08:00", closeTime: "22:00", isOpen: true }, // Tuesday
  { dayOfWeek: 2, openTime: "08:00", closeTime: "22:00", isOpen: true }, // Wednesday
  { dayOfWeek: 3, openTime: "08:00", closeTime: "22:00", isOpen: true }, // Thursday
  { dayOfWeek: 4, openTime: "08:00", closeTime: "00:00", isOpen: true }, // Friday
  { dayOfWeek: 5, openTime: "08:00", closeTime: "00:00", isOpen: true }, // Saturday
  { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Sunday
];

interface BusinessHoursRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
}

export async function getBusinessHours(businessId: string): Promise<BusinessHours[]> {
  const admin = createAdminClient();
  if (!admin) return DEFAULT_HOURS;
  const { data } = await admin
    .from("business_hours")
    .select("day_of_week, open_time, close_time, is_open")
    .eq("business_id", businessId)
    .order("day_of_week", { ascending: true });
  if (!data || data.length === 0) return DEFAULT_HOURS;

  const rows = data as BusinessHoursRow[];
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
  // Fill any missing day defensively (upserts should always write all 7).
  return DEFAULT_HOURS.map((fallback) => {
    const row = byDay.get(fallback.dayOfWeek);
    if (!row) return fallback;
    return {
      dayOfWeek: fallback.dayOfWeek,
      openTime: row.open_time ? row.open_time.slice(0, 5) : fallback.openTime,
      closeTime: row.close_time ? row.close_time.slice(0, 5) : fallback.closeTime,
      isOpen: row.is_open,
    };
  });
}

// ── Integrations ─────────────────────────────────────────────────────────

export type IntegrationCategory = "payments" | "music" | "devices" | "communication" | "analytics";
export type IntegrationConnectionStatus = "connected" | "available" | "coming_soon";

export interface Integration {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationConnectionStatus;
  connectedAt: string | null; // ISO timestamp
  accountLabel: string | null;
}

interface IntegrationCatalogRow {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  availability: "available" | "coming_soon";
}

interface BusinessIntegrationRow {
  integration_key: string;
  connected_at: string;
  account_label: string | null;
}

/** Every catalog row appears; `status` is 'connected' when a
 * `business_integrations` row exists, else the catalog's own `availability`. */
export async function listIntegrations(businessId: string): Promise<Integration[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [{ data: catalogRows }, { data: connectionRows }] = await Promise.all([
    admin
      .from("integration_catalog")
      .select("key, name, category, description, availability")
      .order("key", { ascending: true }),
    admin
      .from("business_integrations")
      .select("integration_key, connected_at, account_label")
      .eq("business_id", businessId),
  ]);

  const connectedByKey = new Map(
    ((connectionRows ?? []) as BusinessIntegrationRow[]).map((r) => [r.integration_key, r]),
  );

  return ((catalogRows ?? []) as IntegrationCatalogRow[]).map((row) => {
    const connection = connectedByKey.get(row.key);
    return {
      key: row.key,
      name: row.name,
      category: row.category,
      description: row.description,
      status: connection ? "connected" : row.availability,
      connectedAt: connection?.connected_at ?? null,
      accountLabel: connection?.account_label ?? null,
    };
  });
}

// ── Billing (read-only) ──────────────────────────────────────────────────

export interface PlanLimits {
  maxLocations: number | null; // null = unlimited
  maxScreens: number | null;
  maxStorageBytes: number | null;
  maxTeamMembers: number | null;
}

export interface BillingUsage {
  locations: number;
  screens: number;
  storageBytes: number;
  teamMembers: number;
}

export interface BillingSummary {
  plan: "starter" | "business" | "enterprise";
  status: "active" | "cancelled" | "past_due";
  limits: PlanLimits;
  usage: BillingUsage;
}

/** Mirrors the seed values in supabase/business-settings.sql, used only if
 * `plan_limits` hasn't been seeded yet (or the row is otherwise missing). */
const DEFAULT_LIMITS_BY_PLAN: Record<BillingSummary["plan"], PlanLimits> = {
  starter: {
    maxLocations: 5,
    maxScreens: 25,
    maxStorageBytes: 10 * 1024 ** 3,
    maxTeamMembers: 5,
  },
  business: {
    maxLocations: 10,
    maxScreens: 100,
    maxStorageBytes: 50 * 1024 ** 3,
    maxTeamMembers: 15,
  },
  enterprise: {
    maxLocations: null,
    maxScreens: null,
    maxStorageBytes: null,
    maxTeamMembers: null,
  },
};

function defaultBillingSummary(): BillingSummary {
  return {
    plan: "starter",
    status: "active",
    limits: DEFAULT_LIMITS_BY_PLAN.starter,
    usage: { locations: 0, screens: 0, storageBytes: 0, teamMembers: 1 },
  };
}

export async function getBillingSummary(businessId: string): Promise<BillingSummary> {
  const admin = createAdminClient();
  if (!admin) return defaultBillingSummary();

  const { data: subRow } = await admin
    .from("business_subscriptions")
    .select("plan, status")
    .eq("business_id", businessId)
    .maybeSingle();
  const plan = (subRow?.plan as BillingSummary["plan"] | undefined) ?? "starter";
  const status = (subRow?.status as BillingSummary["status"] | undefined) ?? "active";

  const { data: limitsRow } = await admin
    .from("plan_limits")
    .select("max_locations, max_screens, max_storage_bytes, max_team_members")
    .eq("plan", plan)
    .maybeSingle();
  const limits: PlanLimits = limitsRow
    ? {
        maxLocations: limitsRow.max_locations,
        maxScreens: limitsRow.max_screens,
        maxStorageBytes: limitsRow.max_storage_bytes,
        maxTeamMembers: limitsRow.max_team_members,
      }
    : DEFAULT_LIMITS_BY_PLAN[plan];

  // Usage: reuse the same branch set (non-archived) for both "locations
  // used" and the screens-per-branch join — an archived branch's devices
  // shouldn't count against the plan's screen limit either.
  const branches = await listBranches(businessId);
  const branchIds = branches.map((b) => b.id);

  let screensUsed = 0;
  if (branchIds.length) {
    const { count } = await admin
      .from("branch_devices")
      .select("id", { count: "exact", head: true })
      .in("branch_id", branchIds);
    screensUsed = count ?? 0;
  }

  // Summed client-side rather than via a PostgREST `sum()` aggregate column
  // — aggregate-in-select support isn't guaranteed enabled on every
  // Supabase project, and a business's own content library is small enough
  // for this to be cheap.
  const { data: contentSizeRows } = await admin
    .from("content_items")
    .select("size_bytes")
    .eq("business_id", businessId);
  const storageBytes = ((contentSizeRows ?? []) as { size_bytes: number | null }[]).reduce(
    (sum, row) => sum + (row.size_bytes ?? 0),
    0,
  );

  const { count: staffCount } = await admin
    .from("business_staff")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return {
    plan,
    status,
    limits,
    usage: {
      locations: branches.length,
      screens: screensUsed,
      storageBytes,
      teamMembers: (staffCount ?? 0) + 1, // + the owner, who has no business_staff row
    },
  };
}
