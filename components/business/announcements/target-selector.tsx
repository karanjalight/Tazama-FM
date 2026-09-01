import { screensFor, type AnnouncementTarget, type AnnouncementTargetOptions, type TargetOption } from "./mock-data";
import { cn } from "@/lib/utils";

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function CheckboxGroup({
  title,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  options: TargetOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = selectedIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                checked ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt.id)}
                className="size-4 shrink-0 rounded border-input accent-violet-600"
              />
              {opt.name}
              {opt.screens !== undefined && <span className="text-xs text-muted-foreground">({opt.screens})</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TargetSelector({
  target,
  options,
  onChange,
}: {
  target: AnnouncementTarget;
  options: AnnouncementTargetOptions;
  onChange: (patch: Partial<AnnouncementTarget>) => void;
}) {
  const deviceCount = screensFor(target.roomIds, options.rooms);

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Where should this announcement play?</p>
      <p className="mb-3 text-xs text-muted-foreground">Select any combination of locations, zones, rooms or audio zones.</p>

      <div className="space-y-4">
        <CheckboxGroup
          title="Locations"
          options={options.locations}
          selectedIds={target.locationIds}
          onToggle={(id) => onChange({ locationIds: toggle(target.locationIds, id) })}
        />
        <CheckboxGroup
          title="Zones"
          options={options.zones}
          selectedIds={target.zoneIds}
          onToggle={(id) => onChange({ zoneIds: toggle(target.zoneIds, id) })}
        />
        <CheckboxGroup
          title="Rooms"
          options={options.rooms}
          selectedIds={target.roomIds}
          onToggle={(id) => onChange({ roomIds: toggle(target.roomIds, id) })}
        />
        <CheckboxGroup
          title="Audio Zones"
          options={options.audioZones}
          selectedIds={target.audioZoneIds}
          onToggle={(id) => onChange({ audioZoneIds: toggle(target.audioZoneIds, id) })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-violet-500/10 p-3.5 text-sm">
        <span className="text-xs font-semibold tracking-wide text-violet-300 uppercase">Selected</span>
        <span className="text-foreground">{target.roomIds.length} room{target.roomIds.length === 1 ? "" : "s"}</span>
        <span className="text-foreground">{target.audioZoneIds.length} audio zone{target.audioZoneIds.length === 1 ? "" : "s"}</span>
        <span className="font-medium text-foreground">{deviceCount} devices</span>
      </div>
    </div>
  );
}
