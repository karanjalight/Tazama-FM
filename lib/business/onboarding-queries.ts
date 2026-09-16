/**
 * Checklist counts for the getting-started card. SERVER ONLY (service-role).
 * Every count is error-tolerant: a table that isn't applied yet, or any other
 * failure, reads as 0 so the item just shows as not done.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistCounts } from "@/lib/business/onboarding-checklist";

const EMPTY: ChecklistCounts = {
  locations: 0,
  connectedScreens: 0,
  playlists: 0,
  contentItems: 0,
  schedules: 0,
  announcements: 0,
  teamMembers: 0,
};

async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count, error } = await query;
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export async function getChecklistCounts(businessId: string): Promise<ChecklistCounts> {
  const admin = createAdminClient();
  if (!admin) return EMPTY;

  const { data: branchRows, error: branchError } = await admin
    .from("branches")
    .select("id")
    .eq("business_id", businessId)
    .is("archived_at", null);
  const branchIds = branchError ? [] : (branchRows ?? []).map((r) => r.id as string);

  const head = { count: "exact" as const, head: true };
  const [connectedScreens, playlists, contentItems, schedules, announcements, teamMembers] = await Promise.all([
    branchIds.length === 0
      ? Promise.resolve(0)
      : safeCount(
          admin.from("branch_devices").select("id", head).in("branch_id", branchIds).not("last_seen_at", "is", null),
        ),
    safeCount(admin.from("business_playlists").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("content_items").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("schedules").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("announcements").select("id", head).eq("business_id", businessId).neq("status", "draft")),
    safeCount(admin.from("business_staff").select("id", head).eq("business_id", businessId)),
  ]);

  return {
    locations: branchIds.length,
    connectedScreens,
    playlists,
    contentItems,
    schedules,
    announcements,
    teamMembers,
  };
}
