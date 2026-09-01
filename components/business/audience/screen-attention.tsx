import { Info } from "lucide-react";

import type { ScreenAttentionRow } from "@/components/business/analytics/data-engine";
import { cn } from "@/lib/utils";

const LEVEL_META = {
  High: { dot: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  Medium: { dot: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  Low: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40" },
} as const;

export function ScreenAttention({ rows }: { rows: ScreenAttentionRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Screen Attention</h2>

      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const meta = LEVEL_META[row.level];
          return (
            <div key={row.id} className={cn("flex items-center justify-between rounded-xl px-3.5 py-2.5", meta.bg)}>
              <span className="text-sm font-medium text-foreground">{row.name}</span>
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", meta.text)}>
                <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                {row.level}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Attention represents an aggregate estimate of audience interaction and activity around a screen. It does not identify
          individuals.
        </p>
      </div>
    </div>
  );
}
