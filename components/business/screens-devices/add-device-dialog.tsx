"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerDevice } from "@/app/business/locations/actions";
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
import { VioletButton } from "@/components/business/branches/new/violet-button";

export interface RoomOption {
  id: string;
  name: string;
}

export function AddDeviceDialog({
  open,
  onOpenChange,
  branchId,
  kind,
  roomOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  kind: "screen" | "audio";
  roomOptions: RoomOption[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [roomId, setRoomId] = React.useState(roomOptions[0]?.id ?? "");
  const [deviceModel, setDeviceModel] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ name: string; code: string } | null>(null);

  const roomNamesById = new Map(roomOptions.map((r) => [r.id, r.name]));

  function reset() {
    setName("");
    setRoomId(roomOptions[0]?.id ?? "");
    setDeviceModel("");
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !roomId) return;
    setSubmitting(true);
    const res = await registerDevice({
      branchId,
      roomId,
      name: trimmed,
      kind,
      deviceModel: deviceModel.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResult({ name: trimmed, code: res.code });
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        {result ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm font-semibold text-foreground">{result.name} registered</p>
            <p className="text-xs text-muted-foreground">
              On the device, open the Tazama Player, choose &ldquo;Enter a code instead,&rdquo; and
              type this code. It expires in 7 days.
            </p>
            <p className="font-mono text-4xl font-semibold tracking-[0.2em] text-violet-400">{result.code}</p>
            <VioletButton type="button" onClick={() => onOpenChange(false)} className="mt-1">
              Done
            </VioletButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{kind === "screen" ? "Register Screen" : "Register Audio Device"}</DialogTitle>
              <DialogDescription>A real pairing code is generated once you save.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="device-name">Name</Label>
                <Input
                  id="device-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={kind === "screen" ? "e.g. Main Hall TV 03" : "e.g. Bar Area Speaker"}
                />
              </div>

              {roomOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="device-room">Room</Label>
                  <Select
                    id="device-room"
                    value={roomNamesById.get(roomId) ?? ""}
                    onValueChange={(v) => {
                      const found = roomOptions.find((r) => r.name === v);
                      if (found) setRoomId(found.id);
                    }}
                    items={roomOptions.map((r) => r.name)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This location has no rooms yet — add one from Rooms & Zones first.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="device-model">Device Model (Optional)</Label>
                <Input
                  id="device-model"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder={kind === "screen" ? 'e.g. 55" LG Smart TV' : "e.g. Tazama Audio Player"}
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
              <VioletButton type="submit" disabled={!name.trim() || !roomId || submitting}>
                {submitting ? "Registering…" : "Register"}
              </VioletButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
