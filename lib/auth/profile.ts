import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import {
  DEMO_AUTH,
  DEMO_COOKIE,
  parseDemoCookie,
  type DemoUser,
} from "@/lib/demo/demo-session";
import type { AccountType } from "@/components/auth/account-type-toggle";

export interface BusinessInfo {
  businessName: string;
  businessPhone: string;
  industry: string;
}

export interface CurrentProfile {
  id: string;
  email: string | undefined;
  fullName: string;
  phone: string | null;
  accountType: AccountType | null;
  avatarKey: string | null;
  genrePreferences: string[];
  onboardingComplete: boolean;
  business?: BusinessInfo;
}

/**
 * Loads the signed-in user's profile (and business details, if any) for use in
 * Server Components. Returns null when there's no authenticated user.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Demo fallback: no real session, but a simulated one may be present.
    if (DEMO_AUTH) {
      const store = await cookies();
      const demo = parseDemoCookie(store.get(DEMO_COOKIE)?.value);
      if (demo) return demoToProfile(demo);
    }
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  let business: BusinessInfo | undefined;
  if (profile.account_type === "business") {
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      business = {
        businessName: data.business_name,
        businessPhone: data.business_phone,
        industry: data.industry,
      };
    }
  }

  return {
    id: profile.id,
    email: user.email,
    fullName: profile.full_name,
    phone: profile.phone,
    accountType: profile.account_type,
    avatarKey: profile.avatar_key,
    genrePreferences: profile.genre_preferences ?? [],
    onboardingComplete: profile.onboarding_complete,
    business,
  };
}

function demoToProfile(d: DemoUser): CurrentProfile {
  return {
    id: d.id,
    email: d.email,
    fullName: d.fullName,
    phone: d.phone,
    accountType: d.accountType,
    avatarKey: d.avatarKey,
    genrePreferences: d.genres ?? [],
    onboardingComplete: true,
    business: d.business,
  };
}

/** A short, friendly first name for greetings. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}
