import Link from "next/link";
import { Check, MonitorPlay, Repeat, CalendarClock, Timer } from "lucide-react";

import type { ScheduleState } from "./schedule-state";
import { RECURRENCE_OPTIONS, TARGET_TREE } from "./wizard-data";

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

export function SuccessState({ state, locationHref }: { state: ScheduleState; locationHref: string }) {
  const recurrence = RECURRENCE_OPTIONS.find((r) => r.id === state.recurrence)?.label ?? "Does not repeat";
  const screens = totalScreensFor(state.roomIds);
  const sessionCount = state.sessions.length;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Schedule Created</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.name || "Your schedule"} is{" "}
        {state.activation === "scheduled"
          ? `set to start on ${state.scheduledStartDate || "the scheduled date"} at ${state.scheduledStartTime}`
          : "now active"}
        .
      </p>

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
        {state.activation === "scheduled" && (
          <div className="flex items-center gap-2.5 text-sm">
            <Timer className="size-4 text-violet-400" />
            <span className="text-foreground">
              Starts {state.scheduledStartDate || "—"} · {state.scheduledStartTime}
            </span>
          </div>
        )}
      </div>

      <Link
        href={locationHref}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        View Schedule
      </Link>
    </div>
  );
}
