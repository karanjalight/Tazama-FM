"use client";

import * as React from "react";

import { ROOM_TYPE_OPTIONS, type WizardZone } from "../wizard-data";
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

export interface NewRoomInput {
  name: string;
  zoneId: string;
  type: string;
  capacity: number;
  description: string;
}

export function AddRoomDialog({
  open,
  onOpenChange,
  zones,
  defaultZoneId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: WizardZone[];
  defaultZoneId: string;
  onCreate: (input: NewRoomInput) => void;
}) {
  const [name, setName] = React.useState("");
  const [zoneId, setZoneId] = React.useState(defaultZoneId);
  const [type, setType] = React.useState(ROOM_TYPE_OPTIONS[0]);
  const [capacity, setCapacity] = React.useState("");
  const [description, setDescription] = React.useState("");

  const zoneNames = zones.map((z) => z.name);
  const selectedZoneName = zones.find((z) => z.id === zoneId)?.name ?? zoneNames[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !zoneId) return;
    onCreate({
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
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>Create a room within a zone.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Garden Seating"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-zone">Zone</Label>
                <Select
                  id="room-zone"
                  value={selectedZoneName}
                  onValueChange={(name) => {
                    const zone = zones.find((z) => z.name === name);
                    if (zone) setZoneId(zone.id);
                  }}
                  items={zoneNames}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-type">Room Type</Label>
                <Select id="room-type" value={type} onValueChange={setType} items={ROOM_TYPE_OPTIONS} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">Capacity</Label>
              <Input
                id="room-capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-description">Description (Optional)</Label>
              <Textarea
                id="room-description"
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
              Add Room
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
