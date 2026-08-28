"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, SlidersHorizontal, Store } from "lucide-react";

import type { MockLocation } from "./mock-data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const STATUS_ITEMS = ["All Status", "Active", "Offline"] as const;
const BUSINESS_ITEMS = ["All Business", "XYZ Restaurant Group"] as const;

function StatusPill({ status }: { status: MockLocation["status"] }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-400" : "text-rose-400",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-rose-500")} />
      {active ? "Active" : "Offline"}
    </span>
  );
}

export function LocationsTable({
  locations,
  total,
  query,
  onQueryChange,
  status,
  onStatusChange,
  business,
  onBusinessChange,
  selectedId,
  onSelect,
}: {
  locations: MockLocation[];
  total: number;
  query: string;
  onQueryChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  business: string;
  onBusinessChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground">
          All Locations <span className="text-muted-foreground">({total})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search locations..."
            className="h-9 w-48 rounded-lg text-sm"
          />
          <Select
            value={status}
            onValueChange={onStatusChange}
            items={STATUS_ITEMS}
            className="h-9 w-32 rounded-lg text-sm"
          />
          <Select
            value={business}
            onValueChange={onBusinessChange}
            items={BUSINESS_ITEMS}
            className="h-9 w-40 rounded-lg text-sm"
          />
          <button
            type="button"
            aria-label="Table settings"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Rooms</th>
              <th className="px-4 py-3 font-medium">Screens</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Active</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const selected = loc.id === selectedId;
              return (
                <tr
                  key={loc.id}
                  onClick={() => onSelect(loc.id)}
                  className={cn(
                    "cursor-pointer border-t border-border transition-colors",
                    selected ? "bg-violet-500/8" : "hover:bg-muted/50",
                  )}
                  style={selected ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-violet-500/25 to-indigo-500/25 text-foreground">
                        <Store className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-medium text-foreground">{loc.name}</p>
                          {loc.badge && (
                            <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                              {loc.badge}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{loc.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{loc.business}</td>
                  <td className="px-4 py-3 text-foreground">{loc.rooms}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{loc.screens}</p>
                    <p className="text-xs text-emerald-400">{loc.screensOnline} online</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={loc.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{loc.lastActive}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label="Row actions"
                      onClick={(e) => e.stopPropagation()}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {locations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No locations match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          Showing {locations.length ? 1 : 0} to {locations.length} of {total} locations
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled
            className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="grid size-7 place-items-center rounded-lg bg-brand/15 font-medium text-brand">
            1
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled
            className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
