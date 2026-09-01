"use client";

import * as React from "react";

import type { WizardZone } from "../wizard-data";
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

export interface UpdateZoneInput {
  id: string;
  name: string;
}

export function EditZoneDialog({
  open,
  onOpenChange,
  zone,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: WizardZone;
  onUpdate: (input: UpdateZoneInput) => void;
}) {
  const [name, setName] = React.useState(zone.name);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onUpdate({ id: zone.id, name: trimmed });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
            <DialogDescription>
              Zones help you organize rooms by area or floor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="edit-zone-name">Zone Name</Label>
            <Input
              id="edit-zone-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Garden Terrace"
            />
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
              Save Changes
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
