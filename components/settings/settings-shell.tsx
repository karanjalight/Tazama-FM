"use client";

import * as React from "react";
import { CreditCard, Disc3, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

import { ProfileTab } from "./profile-tab";
import { SubscriptionsTab } from "./subscriptions-tab";
import { SecurityTab } from "./security-tab";
import { GenresTab } from "./genres-tab";
import type { SettingsTabId } from "./tabs";
import { cn } from "@/lib/utils";
import type { CurrentProfile } from "@/lib/auth/profile";
import type { SubscriptionPlan } from "@/lib/billing/plans";
import type { SubscriptionRecord } from "@/lib/billing/subscription";

const TABS: {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  { id: "profile", label: "Profile", icon: UserRound, blurb: "Name, avatar & account" },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, blurb: "Plan & billing" },
  { id: "security", label: "Security", icon: ShieldCheck, blurb: "Password & email" },
  { id: "genres", label: "Genres", icon: Disc3, blurb: "Your sound" },
];

export function SettingsShell({
  profile,
  currentPlan,
  subscription,
  aiPremium,
  initialTab = "profile",
}: {
  profile: CurrentProfile;
  currentPlan: SubscriptionPlan;
  subscription: SubscriptionRecord | null;
  aiPremium: boolean;
  initialTab?: SettingsTabId;
}) {
  const [active, setActive] = React.useState<SettingsTabId>(initialTab);

  function selectTab(id: SettingsTabId) {
    setActive(id);
    const url = `${window.location.pathname}?tab=${id}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, plan, security and music taste.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[15rem_1fr] md:gap-8">
        {/* rail */}
        <nav
          aria-label="Settings sections"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
        >
          {TABS.map((t) => {
            const selected = active === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => selectTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors outline-none",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/30",
                  selected
                    ? "bg-foreground/6 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                    selected ? "bg-brand text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{t.label}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {t.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* content */}
        <div className="min-w-0 max-w-2xl">
          {active === "profile" && <ProfileTab profile={profile} />}
          {active === "subscriptions" && (
            <SubscriptionsTab
              accountType={profile.accountType}
              currentPlan={currentPlan}
              subscription={subscription}
              aiPremium={aiPremium}
            />
          )}
          {active === "security" && <SecurityTab email={profile.email} />}
          {active === "genres" && (
            <GenresTab initialGenres={profile.genrePreferences} />
          )}
        </div>
      </div>
    </div>
  );
}
