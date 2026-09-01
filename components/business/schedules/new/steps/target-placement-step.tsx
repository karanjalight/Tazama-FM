import { TARGET_TREE } from "../wizard-data";
import type { ScheduleState } from "../schedule-state";
import { TargetSelector } from "./target-selector";

function totalScreensFor(roomIds: string[]): number {
  let total = 0;
  for (const loc of TARGET_TREE) {
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
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
}) {
  const screensSelected = totalScreensFor(state.roomIds);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Target &amp; Placement</h2>
      <p className="text-sm text-muted-foreground">Choose where this schedule will run.</p>

      <div className="mt-4">
        <p className="text-sm font-semibold text-foreground">Target</p>
        <p className="mb-2 text-xs text-muted-foreground">Select all locations, zones or rooms that apply.</p>
        <TargetSelector
          roomIds={state.roomIds}
          onChange={(next) => onChange({ locationIds: next.locationIds, zoneIds: next.zoneIds, roomIds: next.roomIds })}
        />

        <div className="mt-3 space-y-2">
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
        </div>
      </div>
    </div>
  );
}
