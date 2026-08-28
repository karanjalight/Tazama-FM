import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatColor =
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "fuchsia"
  | "rose"
  | "pink";

export interface StatItem {
  key: string;
  label: string;
  value: string;
  sublabel?: string;
  delta?: string;
  deltaLabel?: string;
  icon: LucideIcon;
  color: StatColor;
}

// Static class map — Tailwind can't resolve interpolated `bg-${color}-500/15`.
const COLOR_CLASSES: Record<StatColor, string> = {
  violet: "bg-violet-500/15 text-violet-400",
  blue: "bg-blue-500/15 text-blue-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-400",
  rose: "bg-rose-500/15 text-rose-400",
  pink: "bg-pink-500/15 text-pink-400",
};

export function StatTile({ stat, delayMs = 0 }: { stat: StatItem; delayMs?: number }) {
  const Icon = stat.icon;
  return (
    <div
      className="animate-in flex items-center gap-3 fade-in slide-in-from-bottom-1 rounded-2xl border border-border bg-card  p-4 duration-500 fill-mode-both"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={cn(
          "grid size-12 place-items-center rounded-xl",
          COLOR_CLASSES[stat.color],
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="mt-">
        <p className="mt-3 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {stat.value}
      </p>
      <p className="text-xs text-muted-foreground">{stat.label}</p>
      {stat.delta ? (
        <p className="mt-1 text-[11px] font-medium text-emerald-400">
          ↑ {stat.delta}
          {stat.deltaLabel && (
            <span className="text-muted-foreground"> {stat.deltaLabel}</span>
          )}
        </p>
      ) : stat.sublabel ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{stat.sublabel}</p>
      ) : null}
      </div>
    </div>
  );
}
