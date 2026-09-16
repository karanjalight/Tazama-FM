import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { Trend } from "./format";
import { cn } from "@/lib/utils";

const TREND_META = {
  up: { icon: TrendingUp, className: "text-emerald-400" },
  down: { icon: TrendingDown, className: "text-rose-400" },
  flat: { icon: Minus, className: "text-muted-foreground" },
} as const;

export function AdsKpiCard({
  label,
  value,
  trend,
  sublabel,
  estimated,
  delayMs = 0,
}: {
  label: string;
  value: string;
  trend?: Trend | null;
  sublabel?: string;
  /** Marks a modelled number (views/reach/revenue) rather than a real count. */
  estimated?: boolean;
  delayMs?: number;
}) {
  const meta = trend ? TREND_META[trend.direction] : null;
  return (
    <div
      className="animate-in flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 fade-in slide-in-from-bottom-1 duration-500 fill-mode-both"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {estimated && <span className="rounded bg-muted px-1 py-px text-[9px] font-semibold tracking-wide uppercase">Est.</span>}
      </p>
      <p className="truncate font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {trend && meta ? (
        <p className={cn("flex items-center gap-1 text-xs font-medium", meta.className)}>
          <meta.icon className="size-3.5" aria-hidden="true" />
          {trend.text}
        </p>
      ) : sublabel ? (
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
