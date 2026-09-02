import Link from "next/link";
import { Check, MonitorPlay, Repeat, CalendarClock, Timer, AlertTriangle } from "lucide-react";

import type { ScheduleState } from "./schedule-state";
import { RECURRENCE_OPTIONS } from "./wizard-data";
import type { ScheduleTargetOptions } from "@/lib/business/schedule-target-tree";

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

export function SuccessState({
  state,
  targets,
  scheduleHref,
  activationWarning,
}: {
  state: ScheduleState;
  targets: ScheduleTargetOptions;
  scheduleHref: string;
  /** Set when the schedule was created but "activate immediately" couldn't
   * go through (e.g. a conflicting active schedule) — it still exists as a
   * draft, so this is a heads-up, not a failure. */
  activationWarning?: string | null;
}) {
  const recurrence = RECURRENCE_OPTIONS.find((r) => r.id === state.recurrence)?.label ?? "Does not repeat";
  const screens = totalScreensFor(targets.locations, state.roomIds);
  const sessionCount = state.sessions.length;
  const isActive = state.activation === "now" && !activationWarning;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Schedule Created</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.name || "Your schedule"} was created {isActive ? "and is now active" : "as a draft"}.
      </p>

      {activationWarning && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-left text-xs text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Couldn&apos;t activate it yet: {activationWarning}
        </p>
      )}

      <div className="mt-5 space-y-2.5 rounded-xl border border-border bg-muted/30 p-4 text-left">
        <div className="flex items-center gap-2.5 text-sm">
          <MonitorPlay className="size-4 text-violet-400" />
          <span className="text-foreground">{screens} screens</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <CalendarClock className="size-4 text-violet-400" />
          <span className="text-foreground">
            {sessionCount} session{sessionCount === 1 ? "" : "s"} across the day
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <Repeat className="size-4 text-violet-400" />
          <span className="text-foreground">{recurrence}</span>
        </div>
        {state.activation === "scheduled" && state.scheduledStartDate && (
          <div className="flex items-center gap-2.5 text-sm">
            <Timer className="size-4 text-violet-400" />
            <span className="text-foreground">
              Target start {state.scheduledStartDate} · {state.scheduledStartTime}
            </span>
          </div>
        )}
      </div>

      <Link
        href={scheduleHref}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        View Schedule
      </Link>
    </div>
  );
}
