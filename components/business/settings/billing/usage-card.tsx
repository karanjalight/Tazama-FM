"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BillingUsage, PlanLimits } from "@/lib/business/settings-queries";

interface DisplayMetric {
  id: string;
  label: string;
  used: number;
  /** null = unlimited (enterprise plan). */
  limit: number | null;
  unit?: string;
  /** Decimal places to show for the "used" value (e.g. storage in GB). */
  decimals?: number;
}

function formatUsageNumber(value: number, decimals?: number): string {
  return decimals !== undefined ? value.toFixed(decimals) : String(value);
}

function formatUsageReadout(metric: DisplayMetric): string {
  const used = formatUsageNumber(metric.used, metric.decimals);
  const unit = metric.unit ? ` ${metric.unit}` : "";
  if (metric.limit === null) return `${used}${unit} / Unlimited`;
  const limit = formatUsageNumber(metric.limit);
  return `${used}${unit} / ${limit}${unit}`;
}

const BYTES_PER_GB = 1024 ** 3;

export function UsageCard({ usage, limits }: { usage: BillingUsage; limits: PlanLimits }) {
  const metrics: DisplayMetric[] = [
    { id: "locations", label: "Locations", used: usage.locations, limit: limits.maxLocations },
    { id: "screens", label: "Screens", used: usage.screens, limit: limits.maxScreens },
    {
      id: "storage",
      label: "Storage",
      used: usage.storageBytes / BYTES_PER_GB,
      limit: limits.maxStorageBytes === null ? null : limits.maxStorageBytes / BYTES_PER_GB,
      unit: "GB",
      decimals: 1,
    },
    { id: "team", label: "Team Members", used: usage.teamMembers, limit: limits.maxTeamMembers },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Usage</h2>

      <div className="mt-4 space-y-4">
        {metrics.map((metric) => {
          const pct =
            metric.limit === null || metric.limit === 0
              ? 0
              : Math.min(100, Math.round((metric.used / metric.limit) * 100));
          const overLimit = metric.limit !== null && pct > 90;
          const readout = formatUsageReadout(metric);

          return (
            <div key={metric.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{metric.label}</span>
                <span className={cn("font-medium", overLimit ? "text-rose-400" : "text-muted-foreground")}>
                  {readout}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={metric.used}
                aria-valuemin={0}
                aria-valuemax={metric.limit ?? undefined}
                aria-valuetext={readout}
                aria-label={`${metric.label} usage`}
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full transition-all", overLimit ? "bg-rose-500" : "bg-brand")}
                  style={{ width: metric.limit === null ? "6%" : `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="link"
        className="mt-4 h-auto p-0"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        View detailed usage →
      </Button>
    </div>
  );
}
