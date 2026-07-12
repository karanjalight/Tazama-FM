import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import {
  getPlanForAccount,
  getSubscriptionForAccount,
} from "@/lib/billing/subscription";
import { requirePremium } from "@/lib/premium";
import { SettingsShell } from "@/components/settings/settings-shell";
import { parseSettingsTab } from "@/components/settings/tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [currentPlan, subscription, aiPremium, sp] = await Promise.all([
    getPlanForAccount(profile.id),
    getSubscriptionForAccount(profile.id),
    requirePremium(profile.id),
    searchParams,
  ]);

  return (
    <SettingsShell
      profile={profile}
      currentPlan={currentPlan}
      subscription={subscription}
      aiPremium={aiPremium}
      initialTab={parseSettingsTab(sp?.tab)}
    />
  );
}
