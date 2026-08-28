"use client";

import * as React from "react";
import { GripVertical, MoreVertical, Plus, Store } from "lucide-react";

import { iconForRoomType, type WizardRoom, type WizardZone } from "../wizard-data";
import { cn } from "@/lib/utils";
import { VioletButton } from "../violet-button";
import { useDialogTrigger } from "../use-dialog-trigger";
import { AddZoneDialog } from "../modals/add-zone-dialog";
import { AddRoomDialog, type NewRoomInput } from "../modals/add-room-dialog";

export function RoomsZonesStep({
  zones,
  rooms,
  selectedZoneId,
  onSelectZone,
  onCreateZone,
  onCreateRoom,
}: {
  zones: WizardZone[];
  rooms: WizardRoom[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  onCreateZone: (input: { name: string }) => void;
  onCreateRoom: (input: NewRoomInput) => void;
}) {
  const zoneDialog = useDialogTrigger();
  const roomDialog = useDialogTrigger();

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
            {zones.map((zone) => {
              const selected = zone.id === selectedZone?.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => onSelectZone(zone.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
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
                  <MoreVertical className="size-4 shrink-0 text-muted-foreground" />
                </button>
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
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Rooms in {selectedZone?.name ?? "—"} ({zoneRooms.length})
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Drag to reorder rooms</p>

          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            {zoneRooms.length > 0 && (
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
                            <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
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
                          <button
                            type="button"
                            aria-label="Room actions"
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    </div>
  );
}
