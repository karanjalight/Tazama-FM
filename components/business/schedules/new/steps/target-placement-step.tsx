import { Radio } from "lucide-react";

import type { ScheduleTargetOptions } from "@/lib/business/schedule-target-tree";
import type { ScheduleState } from "../schedule-state";
import { TargetSelector } from "./target-selector";

function totalScreensFor(tree: ScheduleTargetOptions["locations"], roomIds: string[]): number {
  let total = 0;
  for (const loc of tree) {
    for (const zone of loc.zones) {
      for (const room of zone.rooms) {
        if (roomIds.includes(room.id)) total += room.screens;
      }
    }
  }
  return total;
}

export function TargetPlacementStep({
  state,
  onChange,
  targets,
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  targets: ScheduleTargetOptions;
}) {
  const screensSelected = totalScreensFor(targets.locations, state.roomIds);

  function toggleAudioZone(zoneId: string) {
    const zone = targets.audioZones.find((z) => z.id === zoneId);
    if (!zone) return;
    const selected = state.audioZoneIds.includes(zoneId);
    if (selected) {
      onChange({
        audioZoneIds: state.audioZoneIds.filter((id) => id !== zoneId),
        roomIds: state.roomIds.filter((id) => !zone.roomIds.includes(id)),
      });
    } else {
      onChange({
        audioZoneIds: [...state.audioZoneIds, zoneId],
        roomIds: [...new Set([...state.roomIds, ...zone.roomIds])],
      });
    }
  }

  const branchDevices = targets.devices.filter((d) => state.branchIds.includes(d.branchId));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Target &amp; Placement</h2>
        <p className="text-sm text-muted-foreground">Choose where this schedule will run.</p>

        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Target</p>
          <p className="mb-2 text-xs text-muted-foreground">Select all locations, zones or rooms that apply.</p>
          <TargetSelector
            tree={targets.locations}
            roomIds={state.roomIds}
            onChange={(next) => onChange({ branchIds: next.locationIds, zoneIds: next.zoneIds, roomIds: next.roomIds })}
          />
        </div>

        {targets.audioZones.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground">Or target an Audio Zone directly</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Picking an Audio Zone selects the rooms it already covers — this schedule will temporarily
              override that zone&apos;s playback while it&apos;s live.
            </p>
            <div className="flex flex-wrap gap-2">
              {targets.audioZones.map((zone) => {
                const selected = state.audioZoneIds.includes(zone.id);
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => toggleAudioZone(zone.id)}
                    className={
                      selected
                        ? "inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
                        : "inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    }
                  >
                    <Radio className="size-3.5" />
                    {zone.name}
                    <span className={selected ? "text-white/70" : "text-muted-foreground"}>
                      · {zone.branchName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Screens</p>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-muted/40">
            <input
              type="radio"
              name="screen-mode"
              checked={state.screenMode === "all"}
              onChange={() => onChange({ screenMode: "all" })}
              className="mt-1 size-4 shrink-0 accent-violet-600"
            />
            <span className="text-sm text-foreground">
              All screens in selected rooms{" "}
              <span className="text-muted-foreground">({screensSelected} screens)</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-muted/40">
            <input
              type="radio"
              name="screen-mode"
              checked={state.screenMode === "specific"}
              onChange={() => onChange({ screenMode: "specific" })}
              className="mt-1 size-4 shrink-0 accent-violet-600"
            />
            <span className="text-sm text-foreground">Choose specific screens</span>
          </label>

          {state.screenMode === "specific" && (
            <div className="ml-6 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {branchDevices.length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Select a location above to see its screens.
                </p>
              )}
              {branchDevices.map((device) => (
                <label key={device.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={state.specificDeviceIds.includes(device.id)}
                    onChange={() =>
                      onChange({
                        specificDeviceIds: state.specificDeviceIds.includes(device.id)
                          ? state.specificDeviceIds.filter((id) => id !== device.id)
                          : [...state.specificDeviceIds, device.id],
                      })
                    }
                    className="size-3.5 shrink-0 rounded border-input accent-violet-600"
                  />
                  <span className="flex-1 text-sm text-foreground">{device.name}</span>
                  <span className="text-[11px] text-muted-foreground">{device.roomName ?? "Unassigned"}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 hover:bg-muted/40">
          <input
            type="checkbox"
            checked={state.synchronizedPlayback}
            onChange={(e) => onChange({ synchronizedPlayback: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-violet-600"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Synchronized playback</span>
            <span className="block text-xs text-muted-foreground">
              On: every targeted screen plays the exact same track/content at the same moment — best for
              screens within earshot of each other. Off: screens follow the same sequence, but each starts
              on its own, independently — better for weaker Smart TVs, Android boxes or browsers. Same
              choice as an Audio Zone&apos;s own Synchronized Playback toggle.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
