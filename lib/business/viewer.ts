/**
 * The "business viewer" — the current signed-in account resolved against a
 * business: either its owner, or an invited staff member. SERVER ONLY.
 *
 * Unlike rooms, the business dashboard requires a real Supabase session (no
 * demo-session support) — this is a paid B2B surface.
 */
import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessViewer } from "@/lib/business/types";

export async function getBusinessViewer(): Promise<BusinessViewer | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (profile.accountType === "business" && profile.business) {
    return {
      businessId: profile.id,
      businessName: profile.business.businessName,
      role: "owner",
      staffId: null,
      branchIds: "all",
    };
  }

  if (!profile.email) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  // Auto-claim a pending invite that matches this account's email.
  await admin
    .from("business_staff")
    .update({ user_id: profile.id, accepted_at: new Date().toISOString() })
    .eq("email", profile.email)
    .is("user_id", null);

  const { data: staff } = await admin
    .from("business_staff")
    .select("id, business_id, role")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!staff) return null;

  const { data: business } = await admin
    .from("business_profiles")
    .select("business_name")
    .eq("id", staff.business_id)
    .maybeSingle();
  if (!business) return null;

  let branchIds: string[] | "all" = "all";
  if (staff.role === "manager") {
    const { data: rows } = await admin
      .from("business_staff_branches")
      .select("branch_id")
      .eq("staff_id", staff.id);
    branchIds = (rows ?? []).map((r) => r.branch_id as string);
  }

  return {
    businessId: staff.business_id,
    businessName: business.business_name,
    role: staff.role,
    staffId: staff.id,
    branchIds,
  };
}

/** Whether the viewer may act on a specific branch (admins/owner: all; managers: assigned only). */
export function canActOnBranch(viewer: BusinessViewer, branchId: string): boolean {
  return viewer.branchIds === "all" || viewer.branchIds.includes(branchId);
}
