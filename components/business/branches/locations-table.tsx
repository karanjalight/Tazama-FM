"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, SlidersHorizontal, Store } from "lucide-react";

import type { LocationSummary } from "@/lib/business/locations-queries";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const STATUS_ITEMS = ["All Status", "Active", "Offline"] as const;

function StatusPill({ status }: { status: LocationSummary["status"] }) {
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
  selectedId,
  onSelect,
}: {
  locations: LocationSummary[];
  total: number;
  query: string;
  onQueryChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground">
          All Locations <span className="text-muted-foreground">({total})</span>
        </h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search locations..."
            className="h-9 w-full rounded-lg text-sm sm:w-48"
          />
          <Select
            value={status}
            onValueChange={onStatusChange}
            items={STATUS_ITEMS}
            className="h-9 w-32 rounded-lg text-sm"
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

      {/* Table on sm: and up; a card per location below sm:. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Location</th>
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
                        <p className="truncate font-medium text-foreground">{loc.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{loc.address ?? "No address set"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{loc.rooms}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{loc.screens}</p>
                    <p className="text-xs text-emerald-400">{loc.screensOnline} online</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={loc.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.lastSeenAt ? formatRelativeTime(loc.lastSeenAt) : "Never"}
                  </td>
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
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No locations match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 border-t border-border p-4 sm:hidden">
        {locations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No locations match your filters.</p>
        ) : (
          locations.map((loc) => {
            const selected = loc.id === selectedId;
            return (
              <div
                key={loc.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(loc.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(loc.id)}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  selected ? "border-violet-500 bg-violet-500/8" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-violet-500/25 to-indigo-500/25 text-foreground">
                    <Store className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{loc.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{loc.address ?? "No address set"}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Row actions"
                    onClick={(e) => e.stopPropagation()}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">{loc.rooms} rooms</span>
                  <span className="text-muted-foreground">
                    {loc.screens} screens · <span className="text-emerald-400">{loc.screensOnline} online</span>
                  </span>
                  <StatusPill status={loc.status} />
                  <span className="text-muted-foreground">{loc.lastSeenAt ? formatRelativeTime(loc.lastSeenAt) : "Never"}</span>
                </div>
              </div>
            );
          })
        )}
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
