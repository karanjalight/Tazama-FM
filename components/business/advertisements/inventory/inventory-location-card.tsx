"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { InventoryLocation } from "./mock-data";

export function InventoryLocationCard({ location }: { location: InventoryLocation }) {
  const [expanded, setExpanded] = React.useState(false);
  const availablePct = Math.round((location.available / location.total) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="font-semibold text-foreground">{location.name}</p>
          <p className="text-xs text-muted-foreground">
            {location.total} screens · {location.available} available · {location.booked} booked
          </p>
        </div>
        {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-amber-500/30">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${availablePct}%` }} />
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {location.zones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{zone.name}</span>
              <span className="text-muted-foreground">
                {zone.total} screens · <span className="text-emerald-400">{zone.available} available</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
