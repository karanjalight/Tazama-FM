"use client";

import * as React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPlan,
  upgradablePlans,
  type SubscriptionPlan,
} from "@/lib/billing/plans";
import { AI_PREMIUM_USD } from "@/lib/billing/ai";
import type { AccountType } from "@/components/auth/account-type-toggle";
import type { SubscriptionRecord } from "@/lib/billing/subscription";

const CALLBACK = "/dashboard/settings?tab=subscriptions";

const STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  free: { label: "Free", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  past_due: { label: "Past due", variant: "destructive" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PerkList({ perks }: { perks: string[] }) {
  return (
    <ul className="space-y-1.5">
      {perks.map((p) => (
        <li key={p} className="flex items-center gap-2 text-sm text-foreground">
          <Check className="size-4 shrink-0 text-brand" strokeWidth={2.5} />
          {p}
        </li>
      ))}
    </ul>
  );
}

export function SubscriptionsTab({
  accountType,
  currentPlan,
  subscription,
  aiPremium,
}: {
  accountType: AccountType | null;
  currentPlan: SubscriptionPlan;
  subscription: SubscriptionRecord | null;
  aiPremium: boolean;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const plan = getPlan(currentPlan);
  const status =
    subscription?.status ?? (currentPlan === "free" ? "free" : "active");
  const badge = STATUS[status] ?? { label: status, variant: "secondary" as const };
  const renewal = subscription?.currentPeriodEnd ?? null;
  const upgrades = upgradablePlans(accountType).filter(
    (p) => p.id !== currentPlan,
  );

  async function checkout(url: string, body: object, key: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (res.ok && data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
        return;
      }
      toast.error(data.error ?? "Could not start checkout.");
    } catch {
      toast.error("Could not start checkout. Check your connection.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {/* current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {plan.name} — {plan.price > 0 ? `$${plan.price}/mo` : "Free"} ·{" "}
            {plan.tagline}
          </CardDescription>
          <CardAction>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <PerkList perks={plan.perks} />
          {status === "active" && currentPlan !== "free" && renewal && (
            <p className="text-xs text-muted-foreground">
              Renews {fmtDate(renewal)}
            </p>
          )}
          {status === "cancelled" && (
            <p className="text-xs text-muted-foreground">
              Your plan is cancelled{renewal ? ` and ends ${fmtDate(renewal)}` : ""}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* upgrade options */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          {currentPlan === "free" ? "Upgrade" : "Change plan"}
        </h2>
        {upgrades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            You’re on the top plan for your account type.
          </p>
        ) : (
          upgrades.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  ${p.price}/mo · {p.tagline}
                </CardDescription>
                <CardAction>
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() =>
                      checkout("/api/billing/checkout", { plan: p.id, callbackPath: CALLBACK }, p.id)
                    }
                    disabled={busy !== null}
                  >
                    {busy === p.id && <Loader2 className="size-3.5 animate-spin" />}
                    {busy === p.id ? "Starting…" : "Upgrade"}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <PerkList perks={p.perks} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI premium */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Add-ons</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              AI Concierge
            </CardTitle>
            <CardDescription>
              A personal AI that builds playlists and runs your rooms — $
              {AI_PREMIUM_USD}/mo.
            </CardDescription>
            {aiPremium && (
              <CardAction>
                <Badge variant="default">Active</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {aiPremium ? (
              <p className="text-sm text-muted-foreground">
                Your concierge is active. Find it in the Concierge tab.
              </p>
            ) : (
              <Button
                type="button"
                variant="brand"
                size="pill"
                onClick={() =>
                  checkout("/api/premium/checkout", { callbackPath: CALLBACK }, "ai")
                }
                disabled={busy !== null}
              >
                {busy === "ai" && <Loader2 className="size-4 animate-spin" />}
                {busy === "ai" ? "Starting…" : `Enable for $${AI_PREMIUM_USD}/mo`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
