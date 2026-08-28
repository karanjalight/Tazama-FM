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
import { VioletButton } from "../violet-button";

export interface NewAudioZoneInput {
  name: string;
  roomIds: string[];
}

export function AddAudioZoneDialog({
  open,
  onOpenChange,
  rooms,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: WizardRoom[];
  onCreate: (input: NewAudioZoneInput) => void;
}) {
  const [name, setName] = React.useState("");
  const [roomIds, setRoomIds] = React.useState<string[]>([]);

  function toggleRoom(id: string) {
    setRoomIds((ids) => (ids.includes(id) ? ids.filter((r) => r !== id) : [...ids, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ name: trimmed, roomIds });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Audio Zone</DialogTitle>
            <DialogDescription>Group rooms that should share independent audio.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="audio-zone-name">Zone Name</Label>
              <Input
                id="audio-zone-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bar & Lounge Audio"
              />
            </div>

            {rooms.length > 0 && (
              <div className="space-y-1.5">
                <Label>Rooms (Optional)</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {rooms.map((room) => (
                    <label
                      key={room.id}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={roomIds.includes(room.id)}
                        onChange={() => toggleRoom(room.id)}
                        className="size-4 rounded border-input accent-violet-600"
                      />
                      {room.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <VioletButton type="submit" disabled={!name.trim()}>
              Add Audio Zone
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
