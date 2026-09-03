"use client";

import * as React from "react";
import { MoreVertical, Pencil, Plus, Store, Trash2 } from "lucide-react";

import { iconForRoomType, type WizardRoom, type WizardZone } from "../wizard-data";
import { cn } from "@/lib/utils";
import { VioletButton } from "../violet-button";
import { useDialogTrigger } from "../use-dialog-trigger";
import { AddZoneDialog } from "../modals/add-zone-dialog";
import { AddRoomDialog, type NewRoomInput } from "../modals/add-room-dialog";
import { EditZoneDialog, type UpdateZoneInput } from "../modals/edit-zone-dialog";
import { EditRoomDialog, type UpdateRoomInput } from "../modals/edit-room-dialog";

/** The room row's kebab dropdown (edit/delete) — open/close state lives in
 * the parent (`openRoomMenuId`), not here, so the table row and the mobile
 * card can share one instance of the exact same interaction. */
function RoomActionsMenu({
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Room actions"
        onClick={onToggle}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="size-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute top-full right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lift">
            <button
              type="button"
              onClick={onEdit}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Mobile card — identity (icon + name + tag) and type up top, capacity and
 * description as a compact grid beneath, same actions menu as the table.
 * `Icon` is resolved by the caller (same as the table's row map) and passed
 * in as a prop rather than looked up here, so the dynamic icon-by-type
 * lookup — a plain function call, not a statically analyzable literal —
 * never sits directly in a component body next to its own JSX usage. */
function RoomCard({
  room,
  Icon,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: {
  room: WizardRoom;
  Icon: ReturnType<typeof iconForRoomType>;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-indigo-500/25 text-foreground">
          <Store className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-foreground">{room.name}</p>
            {room.tag && (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                {room.tag}
              </span>
            )}
          </div>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5" />
            {room.type}
          </p>
        </div>
        <RoomActionsMenu isOpen={isMenuOpen} onToggle={onToggleMenu} onClose={onCloseMenu} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 border-t border-border pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">Capacity</p>
          <p className="mt-0.5 text-foreground">{room.capacity}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Description</p>
          <p className="mt-0.5 text-foreground">{room.description}</p>
        </div>
      </div>
    </div>
  );
}

export function RoomsZonesStep({
  zones,
  rooms,
  selectedZoneId,
  onSelectZone,
  onCreateZone,
  onCreateRoom,
  onUpdateZone,
  onDeleteZone,
  onUpdateRoom,
  onDeleteRoom,
}: {
  zones: WizardZone[];
  rooms: WizardRoom[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onCreateZone: (input: { name: string }) => void;
  onCreateRoom: (input: NewRoomInput) => void;
  onUpdateZone: (input: UpdateZoneInput) => void;
  onDeleteZone: (zoneId: string) => void;
  onUpdateRoom: (input: UpdateRoomInput) => void;
  onDeleteRoom: (roomId: string) => void;
}) {
  const zoneDialog = useDialogTrigger("zone");
  const roomDialog = useDialogTrigger("room");

  const [openZoneMenuId, setOpenZoneMenuId] = React.useState<string | null>(null);
  const [openRoomMenuId, setOpenRoomMenuId] = React.useState<string | null>(null);
  const [editingZone, setEditingZone] = React.useState<WizardZone | null>(null);
  const [editingRoom, setEditingRoom] = React.useState<WizardRoom | null>(null);

  const roomCountByZone = (zoneId: string) => rooms.filter((r) => r.zoneId === zoneId).length;
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? zones[0];
  const zoneRooms = rooms.filter((r) => r.zoneId === selectedZone?.id);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Rooms & Zones</h2>
          <p className="text-sm text-muted-foreground">
            Create rooms and zones for this location. You can add more later.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VioletButton variant="outline" onClick={() => zoneDialog.show()}>
            <Plus className="size-4" />
            Add Zone
          </VioletButton>
          <VioletButton onClick={() => roomDialog.show()} disabled={zones.length === 0}>
            <Plus className="size-4" />
            Add Room
          </VioletButton>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div>
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Zones ({zones.length})
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Zones help you organize rooms by area or floor.
          </p>
          <div className="mt-3 space-y-2">
            {zones.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm font-medium text-foreground">No zones yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add your first one to start organizing rooms.
                </p>
              </div>
            )}
            {zones.map((zone) => {
              const selected = zone.id === selectedZone?.id;
              return (
                <div
                  key={zone.id}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-xl border p-2 transition-colors",
                    selected
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectZone(zone.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          selected ? "text-violet-300" : "text-foreground",
                        )}
                      >
                        {zone.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {roomCountByZone(zone.id)} rooms
                      </span>
                    </span>
                  </button>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="Zone actions"
                      onClick={() => setOpenZoneMenuId((id) => (id === zone.id ? null : zone.id))}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openZoneMenuId === zone.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenZoneMenuId(null)}
                        />
                        <div className="absolute top-full right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lift">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenZoneMenuId(null);
                              setEditingZone(zone);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenZoneMenuId(null);
                              onDeleteZone(zone.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => zoneDialog.show()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              <Plus className="size-4" />
              Add Zone
            </button>
          </div>
        </div>

        <div>
          {zones.length === 0 ? (
            <div className="grid h-full min-h-40 place-items-center rounded-xl border border-dashed border-border p-10 text-center">
              <div>
                <p className="text-sm font-medium text-foreground">No zones yet</p>
                <p className="mt-1 max-w-56 text-xs text-muted-foreground">
                  Add a zone first, then you can start adding rooms to it.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                Rooms in {selectedZone?.name ?? "—"} ({zoneRooms.length})
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                {zoneRooms.length > 0 && (
                  <>
                    {/* Table — sm and up */}
                    <div className="hidden sm:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2.5 font-medium">Room Name</th>
                            <th className="px-3 py-2.5 font-medium">Room Type</th>
                            <th className="px-3 py-2.5 font-medium">Capacity</th>
                            <th className="px-3 py-2.5 font-medium">Description</th>
                            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zoneRooms.map((room) => {
                            const Icon = iconForRoomType(room.type);
                            return (
                              <tr key={room.id} className="border-b border-border last:border-b-0">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-indigo-500/25 text-foreground">
                                      <Store className="size-4" />
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="font-medium text-foreground">{room.name}</span>
                                      {room.tag && (
                                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                                          {room.tag}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <Icon className="size-3.5" />
                                    {room.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-foreground">{room.capacity}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{room.description}</td>
                                <td className="px-3 py-2.5 text-right">
                                  <RoomActionsMenu
                                    isOpen={openRoomMenuId === room.id}
                                    onToggle={() => setOpenRoomMenuId((id) => (id === room.id ? null : room.id))}
                                    onClose={() => setOpenRoomMenuId(null)}
                                    onEdit={() => {
                                      setOpenRoomMenuId(null);
                                      setEditingRoom(room);
                                    }}
                                    onDelete={() => {
                                      setOpenRoomMenuId(null);
                                      onDeleteRoom(room.id);
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Stacked cards — below sm */}
                    <div className="space-y-3 p-3 sm:hidden">
                      {zoneRooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          Icon={iconForRoomType(room.type)}
                          isMenuOpen={openRoomMenuId === room.id}
                          onToggleMenu={() => setOpenRoomMenuId((id) => (id === room.id ? null : room.id))}
                          onCloseMenu={() => setOpenRoomMenuId(null)}
                          onEdit={() => {
                            setOpenRoomMenuId(null);
                            setEditingRoom(room);
                          }}
                          onDelete={() => {
                            setOpenRoomMenuId(null);
                            onDeleteRoom(room.id);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  disabled={!selectedZone}
                  onClick={() => roomDialog.show()}
                  className={cn(
                    "flex w-full items-center justify-center gap-1.5 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                    zoneRooms.length > 0 && "border-t border-border",
                  )}
                >
                  <Plus className="size-4" />
                  Add Room to {selectedZone?.name ?? "a zone"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AddZoneDialog
        key={zoneDialog.dialogKey}
        open={zoneDialog.open}
        onOpenChange={zoneDialog.onOpenChange}
        onCreate={onCreateZone}
      />
      <AddRoomDialog
        key={roomDialog.dialogKey}
        open={roomDialog.open}
        onOpenChange={roomDialog.onOpenChange}
        zones={zones}
        defaultZoneId={selectedZone?.id ?? zones[0]?.id ?? ""}
        onCreate={onCreateRoom}
      />
      {editingZone && (
        <EditZoneDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingZone(null);
          }}
          zone={editingZone}
          onUpdate={onUpdateZone}
        />
      )}
      {editingRoom && (
        <EditRoomDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingRoom(null);
          }}
          zones={zones}
          room={editingRoom}
          onUpdate={onUpdateRoom}
        />
      )}
    </div>
  );
}
