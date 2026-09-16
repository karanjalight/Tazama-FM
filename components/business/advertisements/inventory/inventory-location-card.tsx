"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { InventoryCounts, InventoryLocation } from "@/lib/business/ad-inventory-queries";

function CountsBar({ counts, className }: { counts: InventoryCounts; className?: string }) {
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);
  return (
    <div
      className={`flex h-2 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
      role="img"
      aria-label={`${counts.available} available, ${counts.booked} booked, ${counts.restricted} with ads off`}
    >
      <div className="h-full bg-emerald-500" style={{ width: `${pct(counts.available)}%` }} />
      <div className="h-full bg-amber-500" style={{ width: `${pct(counts.booked)}%` }} />
      <div className="h-full bg-rose-500/50" style={{ width: `${pct(counts.restricted)}%` }} />
    </div>
  );
}

export function InventoryLocationCard({ location }: { location: InventoryLocation }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {location.name}
            {!location.allowsAds && <span className="ml-2 rounded bg-rose-500/10 px-1.5 text-[10px] font-medium text-rose-400">Ads off</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {location.total} screens · <span className="text-emerald-400">{location.available} available</span> ·{" "}
            <span className="text-amber-400">{location.booked} booked</span>
            {location.restricted > 0 && ` · ${location.restricted} off`}
          </p>
        </div>
        {expanded ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </button>

      <CountsBar counts={location} className="mt-2.5" />

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {location.total === 0 && <p className="text-sm text-muted-foreground">No screens paired here yet.</p>}
          {location.zones.map((zone) => (
            <div key={zone.id ?? "no-zone"}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{zone.name}</span>
                <span className="text-xs text-muted-foreground">
                  {zone.total} screens · <span className="text-emerald-400">{zone.available} available</span>
                </span>
              </div>
              <div className="mt-1.5 space-y-1 pl-3">
                {zone.rooms.map((room) => (
                  <div key={room.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{room.name}</span>
                    <CountsBar counts={room} className="w-20 shrink-0" />
                    <span className="w-14 shrink-0 text-right font-mono text-muted-foreground">
                      {room.available}/{room.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
