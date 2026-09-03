"use client";

import { ChevronDown, ChevronRight, LayoutGrid, MoreVertical, Store } from "lucide-react";

import type { Zone, Room } from "@/lib/business/locations-queries";
import { cn } from "@/lib/utils";

export type ViewTab = "overview" | "rooms" | "zones";
export type Selection = { kind: "zone" | "room"; id: string } | null;

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

/** Rooms have no status column in the real schema — every room is
 * effectively "active" once it exists, so this is a static label rather
 * than deriving from a field that doesn't exist. */
function RoomActivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
}

function RowActions() {
  return (
    <button
      type="button"
      aria-label="Row actions"
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <MoreVertical className="size-4" />
    </button>
  );
}

/** Card markup shared by the "grid" view (always shown, plain) and the
 * "list" view's sm:hidden mobile fallback (`detailed`, adds the Zone/Room
 * type pill and an actions kebab so the table's Type and Actions columns
 * aren't silently dropped on mobile). `indent` gives a room card a slight
 * left offset when it's rendered grouped under its zone's card. A div (not
 * a real <button>) so the actions kebab — a real <button> — can nest inside
 * without invalid button-in-button markup. */
function ZoneCard({
  zone,
  roomCount,
  capacity,
  selected,
  onSelect,
  detailed = false,
}: {
  zone: Zone;
  roomCount: number;
  capacity: number;
  selected: boolean;
  onSelect: () => void;
  detailed?: boolean;
}) {
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
        <span className="grid size-9 place-items-center rounded-lg bg-linear-to-br from-blue-500/25 to-indigo-500/25 text-foreground">
          <LayoutGrid className="size-4" />
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
      <div className="mt-2.5 flex items-center gap-1.5">
        <p className="truncate font-medium text-foreground">{zone.name}</p>
        {detailed && (
          <span className="shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
            Zone
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{zone.description || "No description"}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {roomCount} room{roomCount === 1 ? "" : "s"}
        </span>
        <span>{capacity} capacity</span>
      </div>
    </div>
  );
}

function RoomCard({
  room,
  zoneName,
  selected,
  onSelect,
  indent = false,
  detailed = false,
}: {
  room: Room;
  zoneName?: string;
  selected: boolean;
  onSelect: () => void;
  indent?: boolean;
  detailed?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        indent && "ml-4",
        selected ? "border-violet-500/50 bg-violet-500/8" : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-fuchsia-500/25 text-foreground">
          <Store className="size-4" />
        </span>
        <div className="flex items-center gap-1.5">
          <RoomActivePill />
          {detailed && (
            <button
              type="button"
              aria-label="Room actions"
              onClick={(e) => e.stopPropagation()}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <p className="truncate font-medium text-foreground">{room.name}</p>
        {detailed && (
          <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
            Room
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {room.roomDescription || room.roomType || "No description"}
        {zoneName && ` · ${zoneName}`}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{room.capacity ?? "—"} capacity</span>
      </div>
    </div>
  );
}

function ZoneRow({
  zone,
  roomCount,
  capacity,
  indent,
  expandable,
  expanded,
  onToggleExpand,
  selected,
  onSelect,
}: {
  zone: Zone;
  roomCount: number;
  capacity: number;
  indent: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
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
        <div className={cn("flex items-center gap-2", indent && "pl-6")}>
          {expandable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={expanded ? "Collapse zone" : "Expand zone"}
              className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-blue-500/25 to-indigo-500/25 text-foreground">
            <LayoutGrid className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-medium text-foreground">{zone.name}</p>
              <span className="shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                Zone
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {zone.description || `${roomCount} room${roomCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">Zone</td>
      <td className="px-3 py-2.5 text-foreground">{capacity}</td>
      <td className="px-3 py-2.5">
        <StatusPill status={zone.status} />
      </td>
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <RowActions />
      </td>
    </tr>
  );
}

function RoomRow({
  room,
  zoneName,
  indent,
  selected,
  onSelect,
}: {
  room: Room;
  zoneName?: string;
  indent: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
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
        <div className={cn("flex items-center gap-2.5", indent && "pl-6")}>
          {indent && <span className="size-5 shrink-0" />}
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-fuchsia-500/25 text-foreground">
            <Store className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-medium text-foreground">{room.name}</p>
              <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                Room
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {room.roomDescription || room.roomType || "No description"}
              {zoneName && ` · ${zoneName}`}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">Room</td>
      <td className="px-3 py-2.5 text-foreground">{room.capacity ?? "—"}</td>
      <td className="px-3 py-2.5">
        <RoomActivePill />
      </td>
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <RowActions />
      </td>
    </tr>
  );
}

export function ZoneRoomTable({
  view,
  tab,
  zones,
  rooms,
  expandedZoneIds,
  onToggleExpand,
  selection,
  onSelect,
}: {
  view: "list" | "grid";
  tab: ViewTab;
  zones: Zone[];
  rooms: Room[];
  expandedZoneIds: Set<string>;
  onToggleExpand: (zoneId: string) => void;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const zoneName = (id: string | null) => (id ? zones.find((z) => z.id === id)?.name : undefined);
  const roomsForZone = (zoneId: string) => rooms.filter((r) => r.zoneId === zoneId);
  const capacityForZone = (zoneId: string) =>
    roomsForZone(zoneId).reduce((sum, r) => sum + (r.capacity ?? 0), 0);

  if (view === "grid") {
    const zoneCards = tab !== "rooms" ? zones : [];
    const roomCards = tab !== "zones" ? rooms : [];
    return (
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {zoneCards.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            roomCount={roomsForZone(zone.id).length}
            capacity={capacityForZone(zone.id)}
            selected={selection?.kind === "zone" && selection.id === zone.id}
            onSelect={() => onSelect({ kind: "zone", id: zone.id })}
          />
        ))}
        {roomCards.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            zoneName={tab === "rooms" ? zoneName(room.zoneId) : undefined}
            selected={selection?.kind === "room" && selection.id === room.id}
            onSelect={() => onSelect({ kind: "room", id: room.id })}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Table on sm: and up; a card list per zone/room below sm: — same
          data, no horizontal scrolling to see the rest of a row. The
          desktop table's expand/collapse hierarchy isn't ported to mobile —
          for the "overview" tab the mobile fallback just shows every room
          flat under its zone's card instead. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Capacity</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tab === "rooms"
              ? rooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    zoneName={zoneName(room.zoneId)}
                    indent={false}
                    selected={selection?.kind === "room" && selection.id === room.id}
                    onSelect={() => onSelect({ kind: "room", id: room.id })}
                  />
                ))
              : zones.flatMap((zone) => {
                  const expanded = tab === "zones" ? false : expandedZoneIds.has(zone.id);
                  const rows = [
                    <ZoneRow
                      key={zone.id}
                      zone={zone}
                      roomCount={roomsForZone(zone.id).length}
                      capacity={capacityForZone(zone.id)}
                      indent={false}
                      expandable={tab === "overview"}
                      expanded={expanded}
                      onToggleExpand={() => onToggleExpand(zone.id)}
                      selected={selection?.kind === "zone" && selection.id === zone.id}
                      onSelect={() => onSelect({ kind: "zone", id: zone.id })}
                    />,
                  ];
                  if (tab === "overview" && expanded) {
                    roomsForZone(zone.id).forEach((room) => {
                      rows.push(
                        <RoomRow
                          key={room.id}
                          room={room}
                          indent
                          selected={selection?.kind === "room" && selection.id === room.id}
                          onSelect={() => onSelect({ kind: "room", id: room.id })}
                        />,
                      );
                    });
                  }
                  return rows;
                })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {tab === "rooms"
          ? rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                zoneName={zoneName(room.zoneId)}
                detailed
                selected={selection?.kind === "room" && selection.id === room.id}
                onSelect={() => onSelect({ kind: "room", id: room.id })}
              />
            ))
          : zones.map((zone) => {
              const zoneRooms = tab === "overview" ? roomsForZone(zone.id) : [];
              return (
                <div key={zone.id} className="space-y-3">
                  <ZoneCard
                    zone={zone}
                    roomCount={roomsForZone(zone.id).length}
                    capacity={capacityForZone(zone.id)}
                    detailed
                    selected={selection?.kind === "zone" && selection.id === zone.id}
                    onSelect={() => onSelect({ kind: "zone", id: zone.id })}
                  />
                  {zoneRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      indent
                      detailed
                      selected={selection?.kind === "room" && selection.id === room.id}
                      onSelect={() => onSelect({ kind: "room", id: room.id })}
                    />
                  ))}
                </div>
              );
            })}
      </div>
    </>
  );
}
