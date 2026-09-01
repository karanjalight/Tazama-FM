import { TrendingDown, TrendingUp } from "lucide-react";

import type { TrendKpi } from "./data-engine";
import { cn } from "@/lib/utils";

export function AnalyticsKpiCard({ kpi, delayMs = 0 }: { kpi: TrendKpi; delayMs?: number }) {
  const isUp = kpi.trendPct >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      className="animate-in flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 fade-in slide-in-from-bottom-1 duration-500 fill-mode-both"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
      <p className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">{kpi.value}</p>
      <p className={cn("flex items-center gap-1 text-xs font-medium", isUp ? "text-emerald-400" : "text-rose-400")}>
        <TrendIcon className="size-3.5" aria-hidden="true" />
        <span>
          {isUp ? "+" : ""}
          {kpi.trendPct}%
        </span>
        <span className="font-normal text-muted-foreground">{kpi.sublabel}</span>
      </p>
    </div>
  );
}
