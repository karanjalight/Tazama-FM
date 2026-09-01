"use client";

import { MoreVertical, Music, Volume1, Volume2 } from "lucide-react";

import { scheduleLabel, type AudioZone } from "@/lib/business/audio-zone-types";
import { ICON_COLORS } from "./ui-constants";
import { cn } from "@/lib/utils";

const ICON_BG: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-400",
  amber: "bg-amber-500/15 text-amber-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  blue: "bg-blue-500/15 text-blue-400",
  pink: "bg-pink-500/15 text-pink-400",
};

function StatusPill({ status }: { status: "active" | "inactive" }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-400" : "text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/50")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ZoneRow({
  zone,
  index,
  selected,
  onSelect,
}: {
  zone: AudioZone;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = ICON_COLORS[index % ICON_COLORS.length];
  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-t border-border transition-colors",
        selected ? "bg-violet-500/8" : "hover:bg-muted/40",
      )}
      style={selected ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", ICON_BG[color])}>
            <Volume2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{zone.name}</p>
            <p className="truncate text-xs text-muted-foreground">{zone.description || "No description"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{zone.zoneName ?? "—"}</td>
      <td className="px-3 py-2.5">
        <p className="text-foreground">{zone.speakersTotal}</p>
        <p className="text-xs text-emerald-400">
          {zone.speakersTotal === 0
            ? "No speakers"
            : zone.speakersOnline === zone.speakersTotal
              ? "All online"
              : `${zone.speakersOnline} online`}
        </p>
      </td>
      <td className="px-3 py-2.5">
        <StatusPill status={zone.status} />
      </td>
      <td className="px-3 py-2.5">
        {zone.defaultPlaylistName ? (
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-fuchsia-500/25 text-foreground">
              <Music className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-foreground">{zone.defaultPlaylistName}</p>
              <p className="text-xs text-muted-foreground">Default playlist</p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">No default playlist</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Volume1 className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${zone.volume}%` }} />
          </div>
          <span className="w-8 shrink-0 text-xs text-muted-foreground">{zone.volume}%</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{scheduleLabel(zone)}</td>
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Zone actions"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="size-4" />
        </button>
      </td>
    </tr>
  );
}

export function AudioZoneTable({
  view,
  zones,
  selectedId,
  onSelect,
}: {
  view: "list" | "grid";
  zones: AudioZone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone, i) => {
          const selected = zone.id === selectedId;
          const color = ICON_COLORS[i % ICON_COLORS.length];
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelect(zone.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected ? "border-violet-500/50 bg-violet-500/8" : "border-border hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("grid size-9 place-items-center rounded-lg", ICON_BG[color])}>
                  <Volume2 className="size-4" />
                </span>
                <StatusPill status={zone.status} />
              </div>
              <p className="mt-2.5 font-medium text-foreground">{zone.name}</p>
              <p className="text-xs text-muted-foreground">{zone.description || "No description"}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{zone.speakersTotal} speakers</span>
                <span>{zone.volume}% volume</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
          <th className="px-3 py-2.5 font-medium">Name</th>
          <th className="px-3 py-2.5 font-medium">Zone</th>
          <th className="px-3 py-2.5 font-medium">Speakers</th>
          <th className="px-3 py-2.5 font-medium">Status</th>
          <th className="px-3 py-2.5 font-medium">Default Playlist</th>
          <th className="px-3 py-2.5 font-medium">Volume</th>
          <th className="px-3 py-2.5 font-medium">Schedule</th>
          <th className="px-3 py-2.5 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {zones.map((zone, i) => (
          <ZoneRow
            key={zone.id}
            zone={zone}
            index={i}
            selected={zone.id === selectedId}
            onSelect={() => onSelect(zone.id)}
          />
        ))}
      </tbody>
    </table>
  );
}
