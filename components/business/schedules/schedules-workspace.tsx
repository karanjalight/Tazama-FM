"use client";

import * as React from "react";
import { CalendarClock, MoreVertical, Search } from "lucide-react";

import { SCHEDULES, type ScheduleListItem } from "./mock-data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const STATUS_ITEMS = ["All Status", "Active", "Paused", "Draft"] as const;
const TYPE_ITEMS = ["All Types", "Content", "Playlist", "Advertisement", "Audio", "Mixed"] as const;

function StatusPill({ status }: { status: ScheduleListItem["status"] }) {
  const cls =
    status === "active" ? "bg-emerald-500" : status === "paused" ? "bg-rose-500" : "bg-muted-foreground/50";
  const textCls =
    status === "active" ? "text-emerald-400" : status === "paused" ? "text-rose-400" : "text-muted-foreground";
  const label = status === "active" ? "Active" : status === "paused" ? "Paused" : "Draft";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", textCls)}>
      <span className={cn("size-1.5 rounded-full", cls)} />
      {label}
    </span>
  );
}

export function SchedulesWorkspace() {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");
  const [typeFilter, setTypeFilter] = React.useState<(typeof TYPE_ITEMS)[number]>("All Types");
  const [selectedId, setSelectedId] = React.useState<string | null>(SCHEDULES[0]?.id ?? null);

  const q = query.trim().toLowerCase();
  const filtered = SCHEDULES.filter((s) => {
    if (statusFilter !== "All Status" && s.status !== statusFilter.toLowerCase()) return false;
    if (typeFilter !== "All Types" && s.type !== typeFilter) return false;
    if (q && !s.name.toLowerCase().includes(q) && !s.target.toLowerCase().includes(q)) return false;
    return true;
  });

  const selected = SCHEDULES.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search schedules..."
                className="h-9 min-w-40 rounded-lg pl-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as (typeof STATUS_ITEMS)[number])}
              items={STATUS_ITEMS}
              className="h-9 w-32 rounded-lg text-sm"
            />
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as (typeof TYPE_ITEMS)[number])}
              items={TYPE_ITEMS}
              className="h-9 w-36 rounded-lg text-sm"
            />
          </div>

          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Target</th>
                  <th className="px-3 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Recurrence</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const selectedRow = s.id === selectedId;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "cursor-pointer border-t border-border transition-colors",
                        selectedRow ? "bg-violet-500/8" : "hover:bg-muted/40",
                      )}
                      style={selectedRow ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">{s.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                          {s.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.target}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.time}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.recurrence}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Schedule actions"
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No schedules match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-muted-foreground">
            Showing 1 to {filtered.length} of {filtered.length} schedules
          </div>
        </div>
      </div>

      <div>
        {selected ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{selected.name}</p>
                <StatusPill status={selected.status} />
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-foreground">{selected.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-foreground">{selected.target}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Screens</p>
                <p className="text-foreground">{selected.screens} screens</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-foreground">{selected.time}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recurrence</p>
                <p className="text-foreground">{selected.recurrence}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <button
                type="button"
                className="flex-1 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Edit Schedule
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-brand-strong py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a82420]"
              >
                {selected.status === "paused" ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Select a schedule to see its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
