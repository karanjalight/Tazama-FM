"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { TARGET_TREE, type TargetLocation, type TargetZone } from "../wizard-data";
import { Input } from "@/components/ui/input";

function allRoomIdsOf(zones: TargetZone[]): string[] {
  return zones.flatMap((z) => z.rooms.map((r) => r.id));
}

function computeDerived(roomIds: string[]) {
  const zoneIds: string[] = [];
  const locationIds: string[] = [];
  for (const loc of TARGET_TREE) {
    let allZonesFull = loc.zones.length > 0;
    let anyRoomInLoc = false;
    for (const zone of loc.zones) {
      const zoneRoomIds = zone.rooms.map((r) => r.id);
      const allInZone = zoneRoomIds.length > 0 && zoneRoomIds.every((id) => roomIds.includes(id));
      const anyInZone = zoneRoomIds.some((id) => roomIds.includes(id));
      if (anyInZone) anyRoomInLoc = true;
      if (allInZone) zoneIds.push(zone.id);
      else allZonesFull = false;
    }
    if (allZonesFull && anyRoomInLoc) locationIds.push(loc.id);
  }
  return { locationIds, zoneIds, roomIds };
}

export function TargetSelector({
  roomIds,
  onChange,
}: {
  roomIds: string[];
  onChange: (next: { locationIds: string[]; zoneIds: string[]; roomIds: string[] }) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set([TARGET_TREE[0]?.id ?? ""]));

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setRooms(nextRoomIds: string[]) {
    onChange(computeDerived(nextRoomIds));
  }

  function toggleRoom(roomId: string) {
    const next = roomIds.includes(roomId) ? roomIds.filter((id) => id !== roomId) : [...roomIds, roomId];
    setRooms(next);
  }

  function toggleZone(zone: TargetZone) {
    const zoneRoomIds = zone.rooms.map((r) => r.id);
    const allSelected = zoneRoomIds.every((id) => roomIds.includes(id));
    const next = allSelected
      ? roomIds.filter((id) => !zoneRoomIds.includes(id))
      : [...new Set([...roomIds, ...zoneRoomIds])];
    setRooms(next);
  }

  function toggleLocation(loc: TargetLocation) {
    const locRoomIds = allRoomIdsOf(loc.zones);
    const allSelected = locRoomIds.every((id) => roomIds.includes(id));
    const next = allSelected
      ? roomIds.filter((id) => !locRoomIds.includes(id))
      : [...new Set([...roomIds, ...locRoomIds])];
    setRooms(next);
  }

  function countSelected(ids: string[]) {
    return ids.filter((id) => roomIds.includes(id)).length;
  }

  const q = query.trim().toLowerCase();
  const locations = q
    ? TARGET_TREE.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.zones.some((z) => z.name.toLowerCase().includes(q) || z.rooms.some((r) => r.name.toLowerCase().includes(q))),
      )
    : TARGET_TREE;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations..."
            className="h-8 rounded-lg pl-8 text-xs"
          />
        </div>
      </div>

      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
        {locations.map((loc) => {
          const locRoomIds = allRoomIdsOf(loc.zones);
          const locChecked = locRoomIds.length > 0 && locRoomIds.every((id) => roomIds.includes(id));
          const locCount = countSelected(locRoomIds);
          const isExpanded = expanded.has(loc.id);

          return (
            <div key={loc.id}>
              <div className="flex items-center gap-1.5 rounded-lg px-1.5 py-2 hover:bg-muted/40">
                <button type="button" onClick={() => toggleExpand(loc.id)} className="text-muted-foreground">
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <input
                  type="checkbox"
                  checked={locChecked}
                  onChange={() => toggleLocation(loc)}
                  className="size-4 shrink-0 rounded border-input accent-violet-600"
                />
                <span className="flex-1 text-sm font-medium text-foreground">{loc.name}</span>
                <span className="text-xs text-muted-foreground">
                  {locCount > 0 && locCount < locRoomIds.length ? `${locCount}/${locRoomIds.length} screens` : `${loc.totalScreens} screens`}
                </span>
              </div>

              {isExpanded && (
                <div className="ml-6 space-y-1 border-l border-border pl-3">
                  {loc.zones.map((zone) => {
                    const zoneRoomIds = zone.rooms.map((r) => r.id);
                    const zoneChecked = zoneRoomIds.length > 0 && zoneRoomIds.every((id) => roomIds.includes(id));
                    const zoneCount = countSelected(zoneRoomIds);

                    return (
                      <div key={zone.id}>
                        <div className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={zoneChecked}
                            onChange={() => toggleZone(zone)}
                            className="size-3.5 shrink-0 rounded border-input accent-violet-600"
                          />
                          <span className="flex-1 text-sm text-foreground">{zone.name}</span>
                          {zoneCount > 0 && zoneCount < zoneRoomIds.length && (
                            <span className="text-[11px] text-muted-foreground">{zoneCount}/{zoneRoomIds.length}</span>
                          )}
                        </div>
                        <div className="ml-5 space-y-0.5">
                          {zone.rooms.map((room) => (
                            <label
                              key={room.id}
                              className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-muted/40"
                            >
                              <input
                                type="checkbox"
                                checked={roomIds.includes(room.id)}
                                onChange={() => toggleRoom(room.id)}
                                className="size-3.5 shrink-0 rounded border-input accent-violet-600"
                              />
                              <span className="flex-1 text-sm text-muted-foreground">{room.name}</span>
                              <span className="text-[11px] text-muted-foreground">{room.screens} screens</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {locations.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No locations match your search.</p>
        )}
      </div>
    </div>
  );
}
