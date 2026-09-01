"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, DoorOpen, LayoutGrid, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import type { Zone, Room } from "@/lib/business/locations-queries";
import {
  createZone,
  updateZone,
  archiveZone,
  createRoom,
  updateRoom,
  deleteRoom,
} from "@/app/business/locations/actions";
import { ZoneRoomTable, type Selection, type ViewTab } from "./zone-room-table";
import { ZoneDetailPanel, RoomDetailPanel, type ZoneUpdateInput, type RoomUpdateInput } from "./detail-panel";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import { AddZoneDialog } from "@/components/business/branches/new/modals/add-zone-dialog";
import { AddRoomDialog, type NewRoomInput } from "@/components/business/branches/new/modals/add-room-dialog";

const TABS: { id: ViewTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms" },
  { id: "zones", label: "Zones" },
];

const TYPE_ITEMS = ["All Types", "Zone", "Room"] as const;
const STATUS_ITEMS = ["All Status", "Active", "Inactive"] as const;

export function RoomsZonesWorkspace({
  branchId,
  initialZones,
  initialRooms,
}: {
  branchId: string;
  initialZones: Zone[];
  initialRooms: Room[];
}) {
  const router = useRouter();

  const [zones, setZones] = React.useState<Zone[]>(initialZones);
  const [rooms, setRooms] = React.useState<Room[]>(initialRooms);

  // router.refresh() re-fetches server data and passes new initial* props —
  // keep local state in sync instead of silently going stale. Adjusted
  // during render (React's guidance for syncing state to a changed prop)
  // rather than in an effect.
  const [prevInitialZones, setPrevInitialZones] = React.useState(initialZones);
  if (initialZones !== prevInitialZones) {
    setPrevInitialZones(initialZones);
    setZones(initialZones);
  }
  const [prevInitialRooms, setPrevInitialRooms] = React.useState(initialRooms);
  if (initialRooms !== prevInitialRooms) {
    setPrevInitialRooms(initialRooms);
    setRooms(initialRooms);
  }

  const [pending, setPending] = React.useState(false);
  const [tab, setTab] = React.useState<ViewTab>("overview");
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<(typeof TYPE_ITEMS)[number]>("All Types");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");
  const [expandedZoneIds, setExpandedZoneIds] = React.useState<Set<string>>(
    new Set(initialZones.map((z) => z.id)),
  );
  const [selection, setSelection] = React.useState<Selection>({
    kind: "zone",
    id: initialZones[0]?.id ?? "",
  });
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);

  const zoneDialog = useDialogTrigger("zone");
  const roomDialog = useDialogTrigger("room");

  const q = query.trim().toLowerCase();
  const textMatch = (name: string, description: string | null) =>
    !q || name.toLowerCase().includes(q) || (description ?? "").toLowerCase().includes(q);
  const zoneStatusOk = (status: "active" | "inactive") =>
    statusFilter === "All Status" || status === statusFilter.toLowerCase();
  // Rooms have no status column in the schema — every room passes the status
  // filter except an explicit "Inactive" pick, since no room is ever inactive.
  const roomStatusOk = () => statusFilter !== "Inactive";

  const zoneMatchesSelf = (z: Zone) => zoneStatusOk(z.status) && textMatch(z.name, z.description);
  const roomMatchesSelf = (r: Room) => roomStatusOk() && textMatch(r.name, r.roomDescription);

  // A room also surfaces when its zone matched by name (so the whole zone's
  // rooms show together), and a zone also surfaces when one of its rooms
  // matched (so a room match like "Bar Area" isn't hidden just because its
  // parent zone "Main Floor" doesn't itself mention the query).
  const filteredZones =
    typeFilter === "Room"
      ? []
      : zones.filter(
          (z) => zoneMatchesSelf(z) || rooms.some((r) => r.zoneId === z.id && roomMatchesSelf(r)),
        );
  const filteredRooms =
    typeFilter === "Zone"
      ? []
      : rooms.filter((r) => {
          if (!roomStatusOk()) return false;
          if (roomMatchesSelf(r)) return true;
          const zone = zones.find((z) => z.id === r.zoneId);
          return zone ? zoneMatchesSelf(zone) : false;
        });

  function toggleExpand(zoneId: string) {
    setExpandedZoneIds((ids) => {
      const next = new Set(ids);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }

  const selectedZone = selection?.kind === "zone" ? zones.find((z) => z.id === selection.id) : undefined;
  const selectedRoom = selection?.kind === "room" ? rooms.find((r) => r.id === selection.id) : undefined;
  const selectedRoomZone = selectedRoom ? zones.find((z) => z.id === selectedRoom.zoneId) : undefined;

  async function handleCreateZone(input: { name: string }) {
    setPending(true);
    const res = await createZone({ branchId, name: input.name });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Zone created.");
    router.refresh();
  }

  async function handleCreateRoom(input: NewRoomInput) {
    setPending(true);
    const res = await createRoom({
      branchId,
      zoneId: input.zoneId,
      name: input.name,
      roomType: input.type || undefined,
      capacity: input.capacity || undefined,
      description: input.description || undefined,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Room created.");
    router.refresh();
  }

  async function handleUpdateZone(zoneId: string, patch: ZoneUpdateInput) {
    setPending(true);
    const res = await updateZone({ branchId, zoneId, ...patch });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Zone updated.");
    router.refresh();
  }

  async function handleDeleteZone(zoneId: string) {
    if (!confirm("Remove this zone? Its rooms must be moved or removed first.")) return;
    setPending(true);
    const res = await archiveZone({ branchId, zoneId });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Zone removed.");
    setSelection(null);
    router.refresh();
  }

  async function handleUpdateRoom(roomId: string, patch: RoomUpdateInput) {
    setPending(true);
    const res = await updateRoom({ branchId, roomId, ...patch });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Room updated.");
    router.refresh();
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("Delete this room? This can't be undone.")) return;
    setPending(true);
    const res = await deleteRoom({ branchId, roomId });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Room deleted.");
    setSelection(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative">
          <VioletButton onClick={() => setAddMenuOpen((v) => !v)}>
            <Plus className="size-4" />
            Add Room or Zone
            <ChevronDown className="size-3.5 opacity-80" />
          </VioletButton>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute top-full right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lift">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    zoneDialog.show();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <LayoutGrid className="size-4 text-muted-foreground" />
                  Add Zone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    roomDialog.show();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  disabled={zones.length === 0}
                  title={zones.length === 0 ? "Add a zone first" : undefined}
                >
                  <DoorOpen className="size-4 text-muted-foreground" />
                  Add Room
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
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-violet-500 text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rooms or zones..."
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
            <button
              type="button"
              aria-label="Table settings"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SlidersHorizontal className="size-4" />
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
            <ZoneRoomTable
              view={view}
              tab={tab}
              zones={filteredZones}
              rooms={filteredRooms}
              expandedZoneIds={expandedZoneIds}
              onToggleExpand={toggleExpand}
              selection={selection}
              onSelect={setSelection}
            />
            {filteredZones.length === 0 && filteredRooms.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No rooms or zones match your filters.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing 1 to {filteredZones.length + filteredRooms.length} of{" "}
              {filteredZones.length + filteredRooms.length} items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
              >
                ‹
              </button>
              <span className="grid size-7 place-items-center rounded-lg bg-brand/15 font-medium text-brand">1</span>
              <button
                type="button"
                disabled
                className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        {selectedZone ? (
          <ZoneDetailPanel
            zone={selectedZone}
            rooms={rooms}
            onViewRooms={() => setTab("rooms")}
            onUpdate={(patch) => handleUpdateZone(selectedZone.id, patch)}
            onDelete={() => handleDeleteZone(selectedZone.id)}
            pending={pending}
          />
        ) : selectedRoom ? (
          <RoomDetailPanel
            room={selectedRoom}
            zone={selectedRoomZone}
            zones={zones}
            onUpdate={(patch) => handleUpdateRoom(selectedRoom.id, patch)}
            onDelete={() => handleDeleteRoom(selectedRoom.id)}
            pending={pending}
          />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Select a room or zone to see its details.</p>
          </div>
        )}
      </div>

      </div>

      <AddZoneDialog key={zoneDialog.dialogKey} open={zoneDialog.open} onOpenChange={zoneDialog.onOpenChange} onCreate={handleCreateZone} />
      <AddRoomDialog
        key={roomDialog.dialogKey}
        open={roomDialog.open}
        onOpenChange={roomDialog.onOpenChange}
        zones={zones}
        defaultZoneId={zones[0]?.id ?? ""}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
