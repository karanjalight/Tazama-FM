"use client";

import * as React from "react";
import { ExternalLink, MonitorPlay, MoreVertical, Plus, Sparkles, Tv } from "lucide-react";

import type { WizardRoom, WizardScreen, WizardZone } from "../wizard-data";
import { cn } from "@/lib/utils";
import { VioletButton } from "../violet-button";
import { useDialogTrigger } from "../use-dialog-trigger";
import { AddRoomDialog, type NewRoomInput } from "../modals/add-room-dialog";
import { AddScreenDialog, type NewScreenInput } from "../modals/add-screen-dialog";

export function ScreensDevicesStep({
  zones,
  rooms,
  screens,
  selectedRoomId,
  onSelectRoom,
  onCreateRoom,
  onCreateScreen,
  onAutoAssign,
}: {
  zones: WizardZone[];
  rooms: WizardRoom[];
  screens: WizardScreen[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onCreateRoom: (input: NewRoomInput) => void;
  onCreateScreen: (input: NewScreenInput) => void;
  onAutoAssign: () => void;
}) {
  const roomDialog = useDialogTrigger("room");
  const screenDialog = useDialogTrigger("screen");

  const screenCountByRoom = (roomId: string) => screens.filter((s) => s.roomId === roomId).length;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];
  const roomScreens = screens.filter((s) => s.roomId === selectedRoom?.id);
  const roomsWithoutScreens = rooms.filter((r) => screenCountByRoom(r.id) === 0).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Screens & Devices</h2>
          <p className="text-sm text-muted-foreground">
            Add screens (TVs, displays) and assign them to rooms. You can add more later.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VioletButton
            variant="outline"
            disabled={rooms.length === 0}
            onClick={() => screenDialog.show()}
          >
            <Plus className="size-4" />
            Register Screen
          </VioletButton>
          <VioletButton disabled={roomsWithoutScreens === 0} onClick={onAutoAssign}>
            <Sparkles className="size-4" />
            Auto-assign Screens
          </VioletButton>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div>
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Rooms ({rooms.length})
          </p>
          <div className="mt-3 space-y-2">
            {rooms.map((room) => {
              const selected = room.id === selectedRoom?.id;
              const count = screenCountByRoom(room.id);
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      count > 0 ? "bg-blue-500/15 text-blue-400" : "border border-dashed border-border text-muted-foreground",
                    )}
                  >
                    <MonitorPlay className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          selected ? "text-violet-300" : "text-foreground",
                        )}
                      >
                        {room.name}
                      </span>
                      {room.tag && (
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                          {room.tag}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {count} screen{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => roomDialog.show()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              <Plus className="size-4" />
              Add Room
            </button>
          </div>
        </div>

        <div>
          {selectedRoom && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{selectedRoom.name}</h3>
                    {selectedRoom.tag && (
                      <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                        {selectedRoom.tag}
                      </span>
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoom.type} · Capacity: {selectedRoom.capacity}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Edit Room
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Screens in this room ({roomScreens.length})
                </p>
                <VioletButton className="h-9 px-3 text-xs" onClick={() => screenDialog.show()}>
                  <Plus className="size-3.5" />
                  Add Screen
                </VioletButton>
              </div>

              {roomScreens.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium">Screen Name</th>
                        <th className="px-3 py-2.5 font-medium">Device ID</th>
                        <th className="px-3 py-2.5 font-medium">Type</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomScreens.map((screen) => (
                        <tr key={screen.id} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-blue-500/25 to-indigo-500/25 text-foreground">
                                <Tv className="size-4" />
                              </span>
                              <span>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{screen.name}</span>
                                  {screen.isPrimary && (
                                    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                      Primary
                                    </span>
                                  )}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {screen.deviceModel}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs text-muted-foreground italic">
                              Generated on creation
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{screen.type}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-medium",
                                screen.status === "online" ? "text-emerald-400" : "text-rose-400",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  screen.status === "online" ? "bg-emerald-500" : "bg-rose-500",
                                )}
                              />
                              {screen.status === "online" ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              aria-label="Screen actions"
                              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => screenDialog.show()}
                    className="flex w-full flex-col items-center gap-0.5 border-t border-border py-4 text-center transition-colors hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Plus className="size-4" />
                      Add another screen to this room
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      Screens are used to display content, playlists, and announcements.
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
                  <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                    <MonitorPlay className="size-4" />
                  </span>
                  <p className="text-sm font-medium text-foreground">No screens in this room yet</p>
                  <VioletButton className="mt-1 h-9 px-3 text-xs" onClick={() => screenDialog.show()}>
                    <Plus className="size-3.5" />
                    Add Screen
                  </VioletButton>
                </div>
              )}

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-violet-500/10 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-400">
                  <MonitorPlay className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">How screens work</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Screens connect to Tazama using the Tazama Player app. After creating this
                    location, install the app on your TVs or devices and connect them using the
                    unique pairing code.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Learn more
                  <ExternalLink className="size-3" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AddRoomDialog
        key={roomDialog.dialogKey}
        open={roomDialog.open}
        onOpenChange={roomDialog.onOpenChange}
        zones={zones}
        defaultZoneId={zones[0]?.id ?? ""}
        onCreate={onCreateRoom}
      />
      <AddScreenDialog
        key={screenDialog.dialogKey}
        open={screenDialog.open}
        onOpenChange={screenDialog.onOpenChange}
        rooms={rooms}
        defaultRoomId={selectedRoom?.id ?? rooms[0]?.id ?? ""}
        onCreate={onCreateScreen}
      />
    </div>
  );
}
