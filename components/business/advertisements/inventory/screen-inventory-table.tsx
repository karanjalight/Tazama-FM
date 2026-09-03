"use client";

import * as React from "react";

import { INVENTORY_LOCATIONS, INVENTORY_SCREENS, type ScreenAvailability } from "./mock-data";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const LOCATION_ITEMS = ["All Locations", ...INVENTORY_LOCATIONS.map((l) => l.name)] as const;

const AVAILABILITY_META: Record<ScreenAvailability, string> = {
  Available: "text-emerald-400",
  Booked: "text-amber-400",
  Restricted: "text-muted-foreground",
};

export function ScreenInventoryTable() {
  const [location, setLocation] = React.useState<(typeof LOCATION_ITEMS)[number]>("All Locations");
  const [page, setPage] = React.useState(1);

  const filtered = location === "All Locations" ? INVENTORY_SCREENS : INVENTORY_SCREENS.filter((s) => s.location === location);

  // Reset to page 1 when the filter narrows the result set below the current page — adjust during render, not an effect.
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (page > maxPage) setPage(maxPage);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-base font-semibold text-foreground">Screen Inventory</p>
        <Select
          value={location}
          onValueChange={(v) => {
            setLocation(v as (typeof LOCATION_ITEMS)[number]);
            setPage(1);
          }}
          items={LOCATION_ITEMS}
          className="h-9 w-40 rounded-lg text-sm"
        />
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Screen</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Availability</th>
              <th className="py-2 pl-3 text-right font-medium">Estimated CPM</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                <td className="py-2 pr-3 text-foreground">{s.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.location} <span className="text-xs">· {s.zone}</span>
                </td>
                <td className={cn("px-3 py-2 font-medium", AVAILABILITY_META[s.availability])}>{s.availability}</td>
                <td className="py-2 pl-3 text-right">
                  <span className="font-mono text-muted-foreground">KES {s.indicativeCpm}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">Indicative</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {pageItems.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-3">
            <p className="font-medium text-foreground">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.location} <span className="text-xs">· {s.zone}</span>
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className={cn("text-xs font-medium", AVAILABILITY_META[s.availability])}>{s.availability}</span>
              <span>
                <span className="font-mono text-xs text-muted-foreground">KES {s.indicativeCpm}</span>
                <span className="ml-1.5 text-[10px] text-muted-foreground/70">Indicative</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} screens
        </span>
        <div className="flex gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-input px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
            Previous
          </button>
          <button type="button" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-input px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
