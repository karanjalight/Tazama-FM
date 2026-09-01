"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, MonitorPlay, Search, SlidersHorizontal, Volume2 } from "lucide-react";

import type { ManagedDevice } from "@/lib/business/device-queries";
import { DeviceTable } from "./device-table";
import { DeviceDetailPanel } from "./detail-panel";
import { AddDeviceDialog, type RoomOption } from "./add-device-dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VioletButton } from "@/components/business/branches/new/violet-button";

const TABS = ["All", "Screens", "Devices"] as const;
type Tab = (typeof TABS)[number];

const TYPE_ITEMS = ["All Types", "Screen", "Audio Device"] as const;
const STATUS_ITEMS = ["All Status", "Online", "Offline", "Pending"] as const;
const PAGE_SIZE = 10;

export function ScreensDevicesWorkspace({
  branchId,
  devices,
  roomOptions,
}: {
  branchId: string;
  devices: ManagedDevice[];
  roomOptions: RoomOption[];
}) {
  const [tab, setTab] = React.useState<Tab>("All");
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<(typeof TYPE_ITEMS)[number]>("All Types");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");
  const [roomFilter, setRoomFilter] = React.useState("All Rooms");
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(devices[0]?.id ?? null);
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const [addDialogKind, setAddDialogKind] = React.useState<"screen" | "audio" | null>(null);

  const roomOptionNames = ["All Rooms", ...Array.from(new Set(devices.map((d) => d.roomName).filter((n): n is string => !!n)))];

  const screenCount = devices.filter((d) => d.kind === "screen").length;
  const audioCount = devices.filter((d) => d.kind === "audio").length;

  const q = query.trim().toLowerCase();
  const filtered = devices.filter((d) => {
    if (tab === "Screens" && d.kind !== "screen") return false;
    if (tab === "Devices" && d.kind !== "audio") return false;
    if (typeFilter === "Screen" && d.kind !== "screen") return false;
    if (typeFilter === "Audio Device" && d.kind !== "audio") return false;
    if (statusFilter !== "All Status" && d.status !== statusFilter.toLowerCase()) return false;
    if (roomFilter !== "All Rooms" && d.roomName !== roomFilter) return false;
    if (q && !d.name.toLowerCase().includes(q) && !(d.deviceModel ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset to page 1 whenever the filters change — adjusted during render
  // (React's sanctioned pattern for this) rather than an effect, so it
  // can't cause an extra render pass.
  const filterKey = `${tab}|${typeFilter}|${statusFilter}|${roomFilter}|${q}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const clampedPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const selected = devices.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative">
          <VioletButton onClick={() => setAddMenuOpen((v) => !v)}>
            Add Screen or Device
            <ChevronDown className="size-3.5 opacity-80" />
          </VioletButton>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute top-full right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lift">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setAddDialogKind("screen");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <MonitorPlay className="size-4 text-muted-foreground" />
                  Register Screen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setAddDialogKind("audio");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <Volume2 className="size-4 text-muted-foreground" />
                  Register Audio Device
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-1 border-b border-border px-4 pt-3">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    tab === t
                      ? "border-violet-500 text-violet-400"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                  {t === "Screens" && ` (${screenCount})`}
                  {t === "Devices" && ` (${audioCount})`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search screens or devices..."
                  className="h-9 min-w-40 rounded-lg pl-9 text-sm"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as (typeof TYPE_ITEMS)[number])}
                items={TYPE_ITEMS}
                className="h-9 w-32 rounded-lg text-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as (typeof STATUS_ITEMS)[number])}
                items={STATUS_ITEMS}
                className="h-9 w-32 rounded-lg text-sm"
              />
              <Select
                value={roomFilter}
                onValueChange={setRoomFilter}
                items={roomOptionNames}
                className="h-9 w-36 rounded-lg text-sm"
              />
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <SlidersHorizontal className="size-4" />
                Filters
              </button>
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-input">
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={cn(
                    "grid size-9 place-items-center transition-colors",
                    view === "list" ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <List className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setView("grid")}
                  className={cn(
                    "grid size-9 place-items-center transition-colors",
                    view === "grid" ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DeviceTable view={view} devices={pageItems} selectedId={selectedId} onSelect={setSelectedId} />
              {pageItems.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {devices.length === 0
                    ? "No screens or devices registered yet."
                    : "No screens or devices match your filters."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {filtered.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} devices
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={clampedPage <= 1}
                  aria-label="Previous page"
                  className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      "grid size-7 place-items-center rounded-lg font-medium transition-colors",
                      p === clampedPage
                        ? "bg-violet-600 text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={clampedPage >= pageCount}
                  aria-label="Next page"
                  className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          {selected ? (
            <DeviceDetailPanel key={selected.id} device={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Select a screen or device to see its details.</p>
            </div>
          )}
        </div>
      </div>

      {addDialogKind && (
        <AddDeviceDialog
          open={!!addDialogKind}
          onOpenChange={(open) => !open && setAddDialogKind(null)}
          branchId={branchId}
          kind={addDialogKind}
          roomOptions={roomOptions}
        />
      )}
    </div>
  );
}
