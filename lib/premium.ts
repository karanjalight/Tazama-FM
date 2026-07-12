/**
 * AI premium entitlement — the $3 add-on that gates the concierge (chat +
 * playlists). **SERVER ONLY**: reads/writes `premium_access` with the
 * service-role client, and resolves the signed-in user for route guards.
 *
 * Distinct from the account-level room plans in `lib/billing/*` (free /
 * individual / business): AI premium is a per-user product, keyed on
 * `user_id -> auth.users`. It's granted by the Paystack webhook
 * (`/api/billing/webhook`, product:"ai" branch) via `activatePremium`.
 */
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

const PREMIUM_DAYS = 30;

/**
 * Is this user's AI premium active right now?
 * Active = a `premium_access` row with status "active" AND (no expiry OR an
 * expiry still in the future). Defaults to false when unset or unreachable.
 */
export async function requirePremium(userId: string): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("premium_access")
    .select("status, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || data.status !== "active") return false;
  const expires = data.expires_at as string | null;
  if (expires && new Date(expires).getTime() <= Date.now()) return false;
  return true;
}

/**
 * Grant (or renew) AI premium for a user — called by the Paystack webhook on a
 * successful AI charge. Sets status "active" and expires_at = now + 30 days as an
 * ABSOLUTE value, which makes duplicate webhook deliveries idempotent: a repeat
 * of the same charge lands on the same ~now+30 window rather than stacking.
 */
export async function activatePremium(
  userId: string,
  days: number = PREMIUM_DAYS,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !userId) return false;

  const now = Date.now();
  const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from("premium_access").upsert(
    {
      user_id: userId,
      status: "active",
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "user_id" },
  );
  return !error;
}

/**
 * Route guard for every AI endpoint. Resolves the signed-in user and checks
 * premium BEFORE any Claude/YouTube work. Returns the userId on success, or a
 * ready-to-return NextResponse (401 when signed out, 402 when not premium):
 *
 *   const gate = await premiumGuard();
 *   if (gate instanceof NextResponse) return gate;
 *   const { userId } = gate;
 */
export async function premiumGuard(): Promise<
  { userId: string } | NextResponse
> {
  let profile;
  try {
    profile = await getCurrentProfile();
  } catch (err) {
    console.error("premiumGuard: failed to resolve session", err);
    return NextResponse.json({ error: "session_unavailable" }, { status: 503 });
  }
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await requirePremium(profile.id))) {
    return NextResponse.json({ error: "premium_required" }, { status: 402 });
  }
  return { userId: profile.id };
}
