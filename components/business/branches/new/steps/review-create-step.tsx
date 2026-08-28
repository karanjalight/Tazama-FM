import { Building2, DoorOpen, Layers, MapPin, MonitorPlay, Volume2 } from "lucide-react";

import type {
  AudioZone,
  LocationDetailsForm,
  WizardRoom,
  WizardScreen,
  WizardZone,
} from "../wizard-data";

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-center">
      <span className="mx-auto grid size-9 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-2 font-mono text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ReviewCreateStep({
  details,
  zones,
  rooms,
  screens,
  audioZones,
}: {
  details: LocationDetailsForm;
  zones: WizardZone[];
  rooms: WizardRoom[];
  screens: WizardScreen[];
  audioZones: AudioZone[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Review & Create</h2>
      <p className="text-sm text-muted-foreground">
        Double-check everything below, then create the location.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat icon={Layers} label="Zones" value={zones.length} />
        <SummaryStat icon={DoorOpen} label="Rooms" value={rooms.length} />
        <SummaryStat icon={MonitorPlay} label="Screens" value={screens.length} />
        <SummaryStat icon={Volume2} label="Audio Zones" value={audioZones.length} />
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{details.name || "Untitled location"}</p>
            <p className="text-sm text-muted-foreground">{details.business}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="size-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="text-foreground">{details.address || `${details.city}, ${details.country}`}</p>
            <p className="text-muted-foreground">{details.timezone}</p>
          </div>
        </div>
        {details.description && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {details.description}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Ready to go — creating this location will make it available to pair devices and start
        scheduling content right away.
      </div>
    </div>
  );
}
