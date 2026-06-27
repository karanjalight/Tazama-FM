"use client";

import { Check } from "lucide-react";

import {
  PLANS,
  upgradablePlans,
  type Plan,
  type SubscriptionPlan,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/**
 * Plan selector — the wizard's "Upgrade Your Hangout" step and the standalone
 * billing page both use it. Shows Free plus the paid plan(s) the account type
 * is eligible for. Account-level: a paid plan unlocks all of the host's rooms.
 */
export function PlanPicker({
  accountType,
  currentPlan,
  value,
  onChange,
}: {
  accountType: "individual" | "business" | null;
  currentPlan: SubscriptionPlan;
  value: SubscriptionPlan;
  onChange: (plan: SubscriptionPlan) => void;
}) {
  const options: Plan[] = [PLANS.free, ...upgradablePlans(accountType)];

  return (
    <div className="grid gap-3">
      {options.map((plan) => {
        const selected = value === plan.id;
        const isCurrent = currentPlan === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onChange(plan.id)}
            aria-pressed={selected}
            className={cn(
              "group relative flex items-start gap-4 rounded-2xl border p-4 text-left transition-all",
              "hover:border-foreground/30",
              selected
                ? "border-brand bg-brand/[0.04] ring-1 ring-brand"
                : "border-border bg-background",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {plan.name}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plan.tagline}
              </p>
              <ul className="mt-2.5 space-y-1">
                {plan.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Check className="size-3 shrink-0 text-brand" strokeWidth={3} />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {plan.price === 0 ? "Free" : `$${plan.price}`}
              </p>
              {plan.price > 0 && (
                <p className="text-[11px] text-muted-foreground">/ month</p>
              )}
            </div>

            {selected && (
              <span className="absolute top-3 right-3 grid size-4 place-items-center rounded-full bg-brand text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
