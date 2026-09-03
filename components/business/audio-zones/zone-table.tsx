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

/** Card markup shared by the "grid" view (always shown) and the "list"
 * view's sm:hidden mobile fallback. `detailed` reveals the fields the list
 * table has that the plain grid card doesn't (Zone, Default Playlist,
 * Schedule, Actions) so the mobile fallback for list view never silently
 * drops data the table would have shown. A div (not a real <button>) so a
 * real <button> — the actions kebab — can be nested inside without invalid
 * button-in-button markup. */
function ZoneCard({
  zone,
  index,
  selected,
  onSelect,
  detailed = false,
}: {
  zone: AudioZone;
  index: number;
  selected: boolean;
  onSelect: () => void;
  detailed?: boolean;
}) {
  const color = ICON_COLORS[index % ICON_COLORS.length];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected ? "border-violet-500/50 bg-violet-500/8" : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", ICON_BG[color])}>
          <Volume2 className="size-4" />
        </span>
        <div className="flex items-center gap-1.5">
          <StatusPill status={zone.status} />
          {detailed && (
            <button
              type="button"
              aria-label="Zone actions"
              onClick={(e) => e.stopPropagation()}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="size-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2.5 font-medium text-foreground">{zone.name}</p>
      <p className="text-xs text-muted-foreground">{zone.description || "No description"}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{zone.speakersTotal} speakers</span>
        <span>{zone.volume}% volume</span>
      </div>

      {detailed && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Zone</span>
            <span className="truncate text-foreground">{zone.zoneName ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Default playlist</span>
            <span className="truncate text-foreground">{zone.defaultPlaylistName ?? "None"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Schedule</span>
            <span className="truncate text-foreground">{scheduleLabel(zone)}</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <Volume1 className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${zone.volume}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-muted-foreground">{zone.volume}%</span>
          </div>
        </div>
      )}
    </div>
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
        {zones.map((zone, i) => (
          <ZoneCard key={zone.id} zone={zone} index={i} selected={zone.id === selectedId} onSelect={() => onSelect(zone.id)} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Table on sm: and up; a card per zone below sm: — same data, same
          actions, no horizontal scrolling to see the rest of a row. */}
      <div className="hidden overflow-x-auto sm:block">
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
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {zones.map((zone, i) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            index={i}
            selected={zone.id === selectedId}
            onSelect={() => onSelect(zone.id)}
            detailed
          />
        ))}
      </div>
    </>
  );
}
