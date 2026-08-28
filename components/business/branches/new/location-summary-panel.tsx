import { ArrowRight, Camera, Check, DoorOpen, Layers, Lightbulb, MonitorPlay, Store, Volume2 } from "lucide-react";

import type { LocationDetailsForm } from "./wizard-data";
import { WIZARD_STEPS } from "./wizard-data";
import { cn } from "@/lib/utils";

export function LocationSummaryPanel({
  step,
  details,
  zonesCount,
  roomsCount,
  screensCount,
  audioZonesCount,
}: {
  step: number;
  details: LocationDetailsForm;
  zonesCount: number;
  roomsCount: number;
  screensCount: number;
  audioZonesCount: number;
}) {
  const isEarly = step <= 2;
  const progressPct = Math.round((step / WIZARD_STEPS.length) * 100);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          {step === 1 ? "Location Preview" : "Location Summary"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {step === 1
            ? "This is how your location will look."
            : step === 2
              ? "This is how your location is shaping up."
              : "Here's what you've set up so far."}
        </p>
      </div>

      <div className="relative flex h-28 items-end justify-end overflow-hidden rounded-xl bg-linear-to-br from-violet-600/40 via-indigo-600/25 to-transparent p-2">
        <span className="absolute inset-0 -z-10 bg-muted" />
        <Store className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-foreground/10" />
        {step === 1 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground">
            <Camera className="size-3" />
            Change Image
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-semibold text-foreground">
            {details.name || "Untitled location"}
          </p>
          {details.isActive && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          )}
        </div>
        <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
          <p className="truncate">{details.business}</p>
          <p className="truncate">{details.address || `${details.city}, ${details.country}`}</p>
          <p className="truncate">{details.timezone}</p>
        </div>
      </div>

      {isEarly ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">What you&apos;re creating</p>
          <div className="mt-2 space-y-1.5">
            <TallyRow icon={Layers} label="Zones" value={zonesCount} />
            <TallyRow icon={DoorOpen} label="Rooms" value={roomsCount} />
            <TallyRow icon={MonitorPlay} label="Screens" value={screensCount} />
            <TallyRow icon={Volume2} label="Audio Zones" value={audioZonesCount} />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Setup Progress</p>
            <span className="font-mono text-xs font-semibold text-violet-400">{progressPct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            You&apos;re doing great! Just a few more steps to go.
          </p>

          <div className="mt-3 space-y-2">
            {WIZARD_STEPS.map((s) => {
              const done = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                      done && "bg-emerald-500 text-white",
                      active && "bg-violet-600 text-white",
                      !done && !active && "border border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3} /> : s.id}
                  </span>
                  <span className={cn("flex-1 truncate", done || active ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      active ? "text-violet-400" : "text-muted-foreground",
                    )}
                  >
                    {done ? "" : active ? "In progress" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEarly ? (
        <div className="flex items-start gap-2 rounded-xl bg-violet-500/10 p-3 text-xs text-violet-200">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
          <p>
            You can always add or edit rooms, screens and audio zones after creating the
            location.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-violet-500/10 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-violet-200">
            <Lightbulb className="size-3.5 text-violet-400" />
            Need help setting up?
          </p>
          <p className="mt-1 text-violet-200/80">
            Check our setup guide or watch a quick video to get your screens connected.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 font-medium text-violet-300 hover:text-violet-200"
          >
            View Setup Guide
            <ArrowRight className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function TallyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-2">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </span>
      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}
