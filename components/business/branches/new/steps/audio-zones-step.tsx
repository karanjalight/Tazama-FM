"use client";

import { Plus, Volume2 } from "lucide-react";

import type { AudioZone, WizardRoom } from "../wizard-data";
import { VioletButton } from "../violet-button";
import { useDialogTrigger } from "../use-dialog-trigger";
import { AddAudioZoneDialog, type NewAudioZoneInput } from "../modals/add-audio-zone-dialog";

/** No reference mockup for this step yet — a lightweight placeholder consistent with the wizard's visual language, not a fully designed step. */
export function AudioZonesStep({
  rooms,
  audioZones,
  onCreateAudioZone,
}: {
  rooms: WizardRoom[];
  audioZones: AudioZone[];
  onCreateAudioZone: (input: NewAudioZoneInput) => void;
}) {
  const dialog = useDialogTrigger();
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? "Unknown room";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Audio Zones</h2>
          <p className="text-sm text-muted-foreground">
            Group rooms into independent audio zones. You can add more later.
          </p>
        </div>
        <VioletButton onClick={() => dialog.show()}>
          <Plus className="size-4" />
          Add Audio Zone
        </VioletButton>
      </div>

      {audioZones.length > 0 ? (
        <div className="mt-5 space-y-2.5">
          {audioZones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-start gap-3 rounded-xl border border-border p-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-400">
                <Volume2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{zone.name}</p>
                <p className="text-xs text-muted-foreground">
                  {zone.roomIds.length === 0
                    ? "No rooms assigned"
                    : zone.roomIds.map(roomName).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <Volume2 className="size-5" />
          </span>
          <p className="text-sm font-medium text-foreground">No audio zones yet</p>
          <p className="max-w-64 text-xs text-muted-foreground">
            Audio zones aren&apos;t required to create a location — skip this step and set them up
            later from Locations.
          </p>
        </div>
      )}

      <AddAudioZoneDialog
        key={dialog.dialogKey}
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        rooms={rooms}
        onCreate={onCreateAudioZone}
      />
    </div>
  );
}
