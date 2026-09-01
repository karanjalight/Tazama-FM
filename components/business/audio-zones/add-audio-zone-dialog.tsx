"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createAudioZone, updateAudioZone } from "@/app/business/audio-zones/actions";
import type { AudioZone } from "@/lib/business/audio-zone-types";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

export interface AudioZoneOption {
  id: string;
  name: string;
}

const NONE = "None";

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

interface FormValues {
  name: string;
  description: string;
  zoneId: string | null;
  roomIds: string[];
  defaultPlaylistId: string | null;
  volume: number;
  volumeLimit: number;
  crossfadeSeconds: number;
  audioDuckingEnabled: boolean;
  announcementsEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

function valuesFor(zone: AudioZone | undefined): FormValues {
  if (!zone) {
    return {
      name: "",
      description: "",
      zoneId: null,
      roomIds: [],
      defaultPlaylistId: null,
      volume: 50,
      volumeLimit: 100,
      crossfadeSeconds: 3,
      audioDuckingEnabled: true,
      announcementsEnabled: true,
      scheduleStart: "",
      scheduleEnd: "",
    };
  }
  return {
    name: zone.name,
    description: zone.description,
    zoneId: zone.zoneId,
    roomIds: zone.roomIds,
    defaultPlaylistId: zone.defaultPlaylistId,
    volume: zone.volume,
    volumeLimit: zone.volumeLimit,
    crossfadeSeconds: zone.crossfadeSeconds,
    audioDuckingEnabled: zone.audioDuckingEnabled,
    announcementsEnabled: zone.announcementsEnabled,
    scheduleStart: zone.scheduleStart ?? "",
    scheduleEnd: zone.scheduleEnd ?? "",
  };
}

export function AddAudioZoneDialog({
  open,
  onOpenChange,
  branchId,
  zoneOptions,
  roomOptions,
  playlistOptions,
  editingZone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  zoneOptions: AudioZoneOption[];
  roomOptions: AudioZoneOption[];
  playlistOptions: AudioZoneOption[];
  editingZone?: AudioZone;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<FormValues>(() => valuesFor(editingZone));
  const [submitting, setSubmitting] = React.useState(false);

  function patch(p: Partial<FormValues>) {
    setValues((v) => ({ ...v, ...p }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = values.name.trim();
    if (!trimmedName) return;
    setSubmitting(true);

    const payload = {
      branchId,
      name: trimmedName,
      description: values.description.trim(),
      zoneId: values.zoneId,
      roomIds: values.roomIds,
      defaultPlaylistId: values.defaultPlaylistId,
      volume: values.volume,
      volumeLimit: values.volumeLimit,
      crossfadeSeconds: values.crossfadeSeconds,
      audioDuckingEnabled: values.audioDuckingEnabled,
      announcementsEnabled: values.announcementsEnabled,
      scheduleStart: values.scheduleStart || null,
      scheduleEnd: values.scheduleEnd || null,
    };

    const res = editingZone
      ? await updateAudioZone({ id: editingZone.id, ...payload })
      : await createAudioZone(payload);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(editingZone ? "Audio zone updated." : "Audio zone created.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Audio Zone" : "Add Audio Zone"}</DialogTitle>
            <DialogDescription>
              Group rooms that should share independent audio — its own volume, default playlist,
              and daily schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="az-name">Zone Name</Label>
                <Input
                  id="az-name"
                  autoFocus
                  value={values.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="e.g. Terrace Audio"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="az-description">Description (Optional)</Label>
                <Textarea
                  id="az-description"
                  rows={2}
                  value={values.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </div>
              {zoneOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="az-zone">Physical Zone (Optional)</Label>
                  <Select
                    id="az-zone"
                    value={zoneOptions.find((z) => z.id === values.zoneId)?.name ?? NONE}
                    onValueChange={(name) => {
                      const found = zoneOptions.find((z) => z.name === name);
                      patch({ zoneId: found ? found.id : null });
                    }}
                    items={[NONE, ...zoneOptions.map((z) => z.name)]}
                  />
                </div>
              )}
            </div>

            {roomOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Rooms Covered</Label>
                <div className="flex flex-wrap gap-2">
                  {roomOptions.map((room) => {
                    const checked = values.roomIds.includes(room.id);
                    return (
                      <label
                        key={room.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                          checked
                            ? "border-violet-500 bg-violet-500/10 text-violet-300"
                            : "border-border text-foreground hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => patch({ roomIds: toggleId(values.roomIds, room.id) })}
                          className="size-4 shrink-0 rounded border-input accent-violet-600"
                        />
                        {room.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 border-t border-border pt-4">
              {playlistOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="az-playlist">Default Playlist (Optional)</Label>
                  <Select
                    id="az-playlist"
                    value={playlistOptions.find((p) => p.id === values.defaultPlaylistId)?.name ?? NONE}
                    onValueChange={(name) => {
                      const found = playlistOptions.find((p) => p.name === name);
                      patch({ defaultPlaylistId: found ? found.id : null });
                    }}
                    items={[NONE, ...playlistOptions.map((p) => p.name)]}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="az-volume">Volume ({values.volume}%)</Label>
                  <input
                    id="az-volume"
                    type="range"
                    min={0}
                    max={100}
                    value={values.volume}
                    onChange={(e) => patch({ volume: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-violet-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="az-volume-limit">Volume Limit ({values.volumeLimit}%)</Label>
                  <input
                    id="az-volume-limit"
                    type="range"
                    min={0}
                    max={100}
                    value={values.volumeLimit}
                    onChange={(e) => patch({ volumeLimit: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-violet-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="az-crossfade">Crossfade (seconds)</Label>
                <Input
                  id="az-crossfade"
                  type="number"
                  min={0}
                  max={30}
                  value={values.crossfadeSeconds}
                  onChange={(e) => patch({ crossfadeSeconds: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}
                />
              </div>

              <div
                className="space-y-3"
                style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">Audio ducking</p>
                    <p className="text-xs text-muted-foreground">Lower volume automatically during announcements</p>
                  </div>
                  <Switch checked={values.audioDuckingEnabled} onCheckedChange={(v) => patch({ audioDuckingEnabled: v })} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">Announcements</p>
                    <p className="text-xs text-muted-foreground">Allow announcements to play in this zone</p>
                  </div>
                  <Switch checked={values.announcementsEnabled} onCheckedChange={(v) => patch({ announcementsEnabled: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Daily Schedule (Optional)</Label>
              <p className="text-xs text-muted-foreground">Leave blank to play all day.</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  aria-label="Schedule start"
                  value={values.scheduleStart}
                  onChange={(e) => patch({ scheduleStart: e.target.value })}
                />
                <Input
                  type="time"
                  aria-label="Schedule end"
                  value={values.scheduleEnd}
                  onChange={(e) => patch({ scheduleEnd: e.target.value })}
                />
              </div>
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
            <VioletButton type="submit" disabled={!values.name.trim() || submitting}>
              {submitting ? "Saving…" : editingZone ? "Save Changes" : "Add Audio Zone"}
            </VioletButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
