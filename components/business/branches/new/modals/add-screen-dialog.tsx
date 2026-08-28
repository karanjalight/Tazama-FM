"use client";

import * as React from "react";

import type { WizardRoom } from "../wizard-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { VioletButton } from "../violet-button";

const SCREEN_TYPES = ["TV", "Display"] as const;

export interface NewScreenInput {
  name: string;
  roomId: string;
  deviceModel: string;
  type: "TV" | "Display";
}

export function AddScreenDialog({
  open,
  onOpenChange,
  rooms,
  defaultRoomId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: WizardRoom[];
  defaultRoomId: string;
  onCreate: (input: NewScreenInput) => void;
}) {
  const [name, setName] = React.useState("");
  const [roomId, setRoomId] = React.useState(defaultRoomId);
  const [deviceModel, setDeviceModel] = React.useState("");
  const [type, setType] = React.useState<(typeof SCREEN_TYPES)[number]>("TV");

  const roomNames = rooms.map((r) => r.name);
  const selectedRoomName = rooms.find((r) => r.id === roomId)?.name ?? roomNames[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !roomId) return;
    onCreate({
      name: trimmed,
      roomId,
      deviceModel: deviceModel.trim() || "Unregistered display",
      type,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Screen</DialogTitle>
            <DialogDescription>
              A device ID and pairing code are generated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="screen-name">Screen Name</Label>
              <Input
                id="screen-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Hall TV 03"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="screen-room">Room</Label>
                <Select
                  id="screen-room"
                  value={selectedRoomName}
                  onValueChange={(name) => {
                    const room = rooms.find((r) => r.name === name);
                    if (room) setRoomId(room.id);
                  }}
                  items={roomNames}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="screen-type">Type</Label>
                <Select
                  id="screen-type"
                  value={type}
                  onValueChange={(v) => setType(v as "TV" | "Display")}
                  items={SCREEN_TYPES}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="screen-model">Device Model (Optional)</Label>
              <Input
                id="screen-model"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder='e.g. 55" LG Smart TV'
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <VioletButton type="submit" disabled={!name.trim() || !roomId}>
              Add Screen
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
