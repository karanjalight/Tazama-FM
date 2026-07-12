import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { requirePremium } from "@/lib/premium";

/**
 * GET → { active } — does the signed-in user have AI premium? Drives the
 * client `usePremium()` hook. Returns `{ active: false }` (not 401) when signed
 * out so the hook can simply treat the user as non-premium.
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ active: false });
  const active = await requirePremium(profile.id);
  return NextResponse.json({ active });
}
