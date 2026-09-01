import { TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdsKpiCard({
  label,
  value,
  trendText,
  sublabel,
  delayMs = 0,
}: {
  label: string;
  value: string;
  trendText?: string;
  sublabel?: string;
  delayMs?: number;
}) {
  return (
    <div
      className="animate-in flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 fade-in slide-in-from-bottom-1 duration-500 fill-mode-both"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {trendText ? (
        <p className={cn("flex items-center gap-1 text-xs font-medium text-emerald-400")}>
          <TrendingUp className="size-3.5" aria-hidden="true" />
          {trendText}
        </p>
      ) : sublabel ? (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
