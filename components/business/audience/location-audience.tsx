"use client";

import * as React from "react";

import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import type { LocationPerformanceRow, NamedBar } from "@/components/business/analytics/data-engine";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function LocationAudience({ bars, locations }: { bars: NamedBar[]; locations: LocationPerformanceRow[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Audience Activity by Location</h2>
      <div className="mt-4">
        <HorizontalBars items={bars} onSelect={setSelectedId} />
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>Estimated audience activity detail</SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 px-4">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Screens</p>
                  <p className="font-mono text-lg font-semibold text-foreground">{selected.screens}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="font-mono text-lg font-semibold text-emerald-400">{selected.uptimePct}%</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estimated reach</p>
                  <p className="font-mono text-lg font-semibold text-foreground">{selected.reach.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Content plays</p>
                  <p className="font-mono text-lg font-semibold text-foreground">{selected.plays.toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
