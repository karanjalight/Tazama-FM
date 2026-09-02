import type * as React from "react";
import { AlertTriangle, Rocket, Timer } from "lucide-react";

import { PRIORITIES, RECURRENCE_OPTIONS } from "../wizard-data";
import type { ScheduleState } from "../schedule-state";
import type { ScheduleTargetOptions } from "@/lib/business/schedule-target-tree";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatTimeLabel, sessionHasContent, summarizeSessionContent, toMinutes } from "./session-utils";

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

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

function estimatedPlaysPerDay(frequency: string, sessionMinutes: number): number {
  const minutesPerPlay = Number(frequency.match(/\d+/)?.[0]) || 15;
  return Math.round(sessionMinutes / minutesPerPlay);
}

export function ReviewStep({
  state,
  onChange,
  targets,
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  targets: ScheduleTargetOptions;
}) {
  const recurrence = RECURRENCE_OPTIONS.find((r) => r.id === state.recurrence);
  const screensSelected = totalScreensFor(targets.locations, state.roomIds);

  const locations = targets.locations.filter((l) => state.branchIds.includes(l.id)).map((l) => l.name);
  const zones = targets.locations.flatMap((l) => l.zones).filter((z) => state.zoneIds.includes(z.id)).map((z) => z.name);
  const rooms = targets.locations.flatMap((l) => l.zones.flatMap((z) => z.rooms)).filter((r) => state.roomIds.includes(r.id)).map((r) => r.name);

  const sortedSessions = [...state.sessions].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const unconfiguredCount = state.sessions.filter((s) => !sessionHasContent(s)).length;

  const adSessions = state.sessions.filter((s) => s.adsEnabled);
  const totalAdPlaysPerDay = adSessions.reduce((sum, s) => {
    const minutes = Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime));
    return sum + estimatedPlaysPerDay(s.adFrequency, minutes) * Math.max(1, screensSelected);
  }, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Review &amp; Create</h2>
      <p className="text-sm text-muted-foreground">Double-check everything below, then create the schedule.</p>

      <div className="mt-4 space-y-3">
        <SummarySection title="Schedule">
          <p className="text-base font-semibold text-foreground">{state.name || "Untitled schedule"}</p>
          <p className="text-sm text-muted-foreground">{PRIORITIES.find((p) => p.id === state.priority)?.label} priority</p>
          {state.description && <p className="mt-1 text-sm text-muted-foreground">{state.description}</p>}
        </SummarySection>

        <SummarySection title="Target">
          <div className="space-y-1 text-sm">
            <p className="text-foreground">{locations.length > 0 ? locations.join(", ") : "No locations selected"}</p>
            {zones.length > 0 && <p className="text-muted-foreground">Zones: {zones.join(", ")}</p>}
            {rooms.length > 0 && <p className="text-muted-foreground">Rooms: {rooms.join(", ")}</p>}
            <p className="font-medium text-foreground">{screensSelected} screens</p>
            <p className="text-xs text-muted-foreground">
              {state.synchronizedPlayback ? "Synchronized playback" : "Independent playback per screen"}
            </p>
          </div>
        </SummarySection>

        <SummarySection title="Day Schedule">
          {sortedSessions.length > 0 ? (
            <div className="space-y-2">
              {sortedSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    {formatTimeLabel(s.startTime)} – {formatTimeLabel(s.endTime)} · {s.label}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{summarizeSessionContent(s)}</span>
                </div>
              ))}
              {unconfiguredCount > 0 && (
                <p className="flex items-center gap-1.5 pt-1 text-sm text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  {unconfiguredCount} session{unconfiguredCount === 1 ? "" : "s"} still need content
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-amber-400">
              <AlertTriangle className="size-3.5" />
              No sessions added yet
            </p>
          )}
        </SummarySection>

        <SummarySection title="Timing">
          <p className="text-sm text-foreground">{recurrence?.label}</p>
          <p className="text-sm text-muted-foreground">
            {state.startDate || "No start date"}
            {state.endDate ? ` – ${state.endDate}` : ""} · {state.timezone}
          </p>
        </SummarySection>

        {adSessions.length > 0 && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <p className="mb-2 text-xs font-semibold text-violet-300">Estimated Inventory</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-xl font-bold text-foreground">{adSessions.length}</p>
                <p className="text-[11px] text-muted-foreground">Ad sessions</p>
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-foreground">{screensSelected}</p>
                <p className="text-[11px] text-muted-foreground">Screens</p>
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-foreground">~{totalAdPlaysPerDay.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Plays/day</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Estimates only — based on the ad frequency you set, not live analytics.
            </p>
          </div>
        )}

        <SummarySection title="Activation">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-muted/40">
              <input
                type="radio"
                name="activation"
                checked={state.activation === "now"}
                onChange={() => onChange({ activation: "now" })}
                className="mt-1 size-4 shrink-0 accent-violet-600"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  <Rocket className="size-3.5" /> Activate immediately
                </span>
                <span className="block text-xs text-muted-foreground">
                  This schedule starts overriding its targeted screens as soon as it&apos;s created.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-muted/40">
              <input
                type="radio"
                name="activation"
                checked={state.activation === "scheduled"}
                onChange={() => onChange({ activation: "scheduled" })}
                className="mt-1 size-4 shrink-0 accent-violet-600"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  <Timer className="size-3.5" /> Create as a draft
                </span>
                <span className="block text-xs text-muted-foreground">
                  Save it for now — activate it yourself from the Schedules list when you&apos;re ready
                  (a target date below is just a reminder for you, not an automatic start).
                </span>
              </span>
            </label>
            {state.activation === "scheduled" && (
              <div className={cn("ml-6 grid grid-cols-2 gap-3 pt-1")}>
                <Input
                  type="date"
                  value={state.scheduledStartDate}
                  onChange={(e) => onChange({ scheduledStartDate: e.target.value })}
                />
                <Input
                  type="time"
                  value={state.scheduledStartTime}
                  onChange={(e) => onChange({ scheduledStartTime: e.target.value })}
                />
              </div>
            )}
          </div>
        </SummarySection>
      </div>
    </div>
  );
}
