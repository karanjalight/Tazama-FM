"use client";

import * as React from "react";
import {
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import type { AudioZone } from "@/lib/business/audio-zone-types";
import { AudioZoneTable } from "./zone-table";
import { AudioZoneDetailPanel } from "./detail-panel";
import { AddAudioZoneDialog, type AudioZoneOption } from "./add-audio-zone-dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const STATUS_ITEMS = ["All Status", "Active", "Inactive"] as const;
const SORT_ITEMS = ["Sort: A–Z", "Sort: Z–A", "Most Speakers", "Highest Volume"] as const;

export function AudioZonesWorkspace({
  branchId,
  audioZones,
  zoneOptions,
  roomOptions,
  playlistOptions,
}: {
  branchId: string;
  audioZones: AudioZone[];
  zoneOptions: AudioZoneOption[];
  roomOptions: AudioZoneOption[];
  playlistOptions: AudioZoneOption[];
}) {
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");
  const [zoneFilter, setZoneFilter] = React.useState("All Zones");
  const [sort, setSort] = React.useState<(typeof SORT_ITEMS)[number]>("Sort: A–Z");
  const [selectedId, setSelectedId] = React.useState<string | null>(audioZones[0]?.id ?? null);

  const addDialog = useDialogTrigger("audio-zone");

  const zoneFilterOptions = ["All Zones", ...zoneOptions.map((z) => z.name)];

  const q = query.trim().toLowerCase();
  let filtered = audioZones.filter((z) => {
    if (statusFilter !== "All Status" && z.status !== statusFilter.toLowerCase()) return false;
    if (zoneFilter !== "All Zones" && z.zoneName !== zoneFilter) return false;
    if (q && !z.name.toLowerCase().includes(q) && !z.description.toLowerCase().includes(q)) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "Sort: A–Z") return a.name.localeCompare(b.name);
    if (sort === "Sort: Z–A") return b.name.localeCompare(a.name);
    if (sort === "Most Speakers") return b.speakersTotal - a.speakersTotal;
    return b.volume - a.volume;
  });

  const selected = audioZones.find((z) => z.id === selectedId) ?? null;
  const selectedIndex = audioZones.findIndex((z) => z.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <VioletButton onClick={addDialog.show}>
          <Plus className="size-4" />
          Add Audio Zone
          <ChevronDown className="size-3.5 opacity-80" />
        </VioletButton>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 p-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search audio zones..."
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
                value={zoneFilter}
                onValueChange={setZoneFilter}
                items={zoneFilterOptions}
                className="h-9 w-32 rounded-lg text-sm"
              />
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as (typeof SORT_ITEMS)[number])}
                items={SORT_ITEMS}
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

            <div className="overflow-x-auto border-t border-border">
              <AudioZoneTable view={view} zones={filtered} selectedId={selectedId} onSelect={setSelectedId} />
              {filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {audioZones.length === 0
                    ? "No audio zones yet — add one to start controlling music by room."
                    : "No audio zones match your filters."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} audio zones
              </span>
            </div>
          </div>
        </div>

        <div>
          {selected ? (
            <AudioZoneDetailPanel
              key={selected.id}
              zone={selected}
              index={selectedIndex}
              branchId={branchId}
              zoneOptions={zoneOptions}
              roomOptions={roomOptions}
              playlistOptions={playlistOptions}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Select an audio zone to see its details.</p>
            </div>
          )}
        </div>
      </div>

      <AddAudioZoneDialog
        key={addDialog.dialogKey}
        open={addDialog.open}
        onOpenChange={addDialog.onOpenChange}
        branchId={branchId}
        zoneOptions={zoneOptions}
        roomOptions={roomOptions}
        playlistOptions={playlistOptions}
      />
    </div>
  );
}
