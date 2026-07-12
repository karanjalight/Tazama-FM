"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = React.useState(target);
  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return reduced ? target : value;
}

/** A dashboard stat tile: icon, animated tabular number, label — optionally "live". */
export function StatCard({
  icon,
  label,
  value,
  live,
  delayMs = 0,
}: {
  /** A rendered icon element, e.g. `<Building2 className="size-4.5" />` — pass an
   * already-rendered element (not the component reference) since this crosses
   * the server/client boundary. */
  icon: React.ReactNode;
  label: string;
  /** A plain integer animates with a count-up; a string (e.g. "3/5") renders as-is. */
  value: number | string;
  /** Shows a pulsing brand dot next to the label — use for "currently true" stats. */
  live?: boolean;
  delayMs?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const numeric = typeof value === "number" ? value : null;
  const animated = useCountUp(numeric ?? 0, reduced);

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-1 rounded-2xl border border-border bg-card p-5 duration-500 fill-mode-both"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground">
          {icon}
        </span>
        {live && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-brand/70" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {numeric === null ? value : animated}
      </p>
      <p className={cn("text-xs text-muted-foreground", live && "text-brand")}>
        {label}
      </p>
    </div>
  );
}
