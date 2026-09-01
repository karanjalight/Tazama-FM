"use client";

import * as React from "react";

import { ROOM_TYPE_OPTIONS, type WizardRoom, type WizardZone } from "../wizard-data";
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
import { Textarea } from "@/components/ui/textarea";
import { VioletButton } from "../violet-button";

export interface UpdateRoomInput {
  id: string;
  name: string;
  zoneId: string;
  type: string;
  capacity: number;
  description: string;
}

export function EditRoomDialog({
  open,
  onOpenChange,
  zones,
  room,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: WizardZone[];
  room: WizardRoom;
  onUpdate: (input: UpdateRoomInput) => void;
}) {
  const [name, setName] = React.useState(room.name);
  const [zoneId, setZoneId] = React.useState(room.zoneId);
  const [type, setType] = React.useState(room.type);
  const [capacity, setCapacity] = React.useState(String(room.capacity));
  const [description, setDescription] = React.useState(room.description);

  const zoneNames = zones.map((z) => z.name);
  const selectedZoneName = zones.find((z) => z.id === zoneId)?.name ?? zoneNames[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !zoneId) return;
    onUpdate({
      id: room.id,
      name: trimmed,
      zoneId,
      type,
      capacity: Number(capacity) || 0,
      description: description.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>Update this room&apos;s details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-room-name">Room Name</Label>
              <Input
                id="edit-room-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Garden Seating"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-room-zone">Zone</Label>
                <Select
                  id="edit-room-zone"
                  value={selectedZoneName}
                  onValueChange={(name) => {
                    const zone = zones.find((z) => z.name === name);
                    if (zone) setZoneId(zone.id);
                  }}
                  items={zoneNames}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-room-type">Room Type</Label>
                <Select
                  id="edit-room-type"
                  value={type}
                  onValueChange={setType}
                  items={ROOM_TYPE_OPTIONS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-room-capacity">Capacity</Label>
              <Input
                id="edit-room-capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-room-description">Description (Optional)</Label>
              <Textarea
                id="edit-room-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            <VioletButton type="submit" disabled={!name.trim() || !zoneId}>
              Save Changes
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
