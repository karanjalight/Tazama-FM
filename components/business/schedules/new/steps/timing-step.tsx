"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

import { RECURRENCE_OPTIONS, WEEK_DAYS, type Transition } from "../wizard-data";
import type { ScheduleSession, ScheduleState } from "../schedule-state";
import { createSession } from "../schedule-state";
import { DayTimeline } from "./day-timeline";
import { AddSessionDialog } from "./add-session-dialog";
import { SessionContentDialog } from "./session-content-dialog";
import {
  formatDuration,
  formatTimeLabel,
  layerBadgeColorClass,
  sessionColorClass,
  sessionHasContent,
  sessionLayers,
  summarizeSessionContent,
  toMinutes,
  totalScheduledMinutes,
} from "./session-utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import type { ContentItem, Playlist } from "@/lib/business/content-queries";

// Real IANA zone identifiers — Intl.DateTimeFormat (schedule-session-resolver.ts's
// currentHHMMInTimezone, used to resolve which session is live right now)
// needs a real zone string, not a display label like the old mock's
// "East Africa Time (EAT)".
const TIMEZONES = [
  { id: "Africa/Nairobi", label: "East Africa Time (Nairobi)" },
  { id: "Africa/Lagos", label: "West Africa Time (Lagos)" },
  { id: "Africa/Harare", label: "Central Africa Time (Harare)" },
  { id: "Africa/Johannesburg", label: "South Africa Standard Time (Johannesburg)" },
] as const;

const DAY_MINUTES = 24 * 60;

function SessionRow({
  session,
  onOpenContent,
  onEdit,
  onDelete,
}: {
  session: ScheduleSession;
  onOpenContent: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const configured = sessionHasContent(session);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenContent}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenContent();
        }
      }}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
    >
      <span className={cn("size-2.5 shrink-0 rounded-full", sessionColorClass(session))} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{session.label}</p>
          {sessionLayers(session).map((layer) => (
            <span
              key={layer.key}
              className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white", layerBadgeColorClass(layer.key))}
            >
              {layer.label}
            </span>
          ))}
          {configured && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeLabel(session.startTime)} – {formatTimeLabel(session.endTime)} · {summarizeSessionContent(session)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Edit session"
          onClick={onEdit}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete session"
          onClick={onDelete}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function TimingStep({
  state,
  onChange,
  businessContent,
  businessAds,
  businessPlaylists,
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  businessContent: ContentItem[];
  businessAds: ContentItem[];
  businessPlaylists: Playlist[];
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const addDialog = useDialogTrigger("add-session");
  const [editingSession, setEditingSession] = React.useState<ScheduleSession | null>(null);
  const [contentSession, setContentSession] = React.useState<ScheduleSession | null>(null);

  function toggleDay(day: string) {
    const next = state.customDays.includes(day)
      ? state.customDays.filter((d) => d !== day)
      : [...state.customDays, day];
    onChange({ customDays: next });
  }

  function handleAddOrEditSave(input: { label: string; startTime: string; endTime: string; transition: Transition }) {
    if (editingSession) {
      onChange({
        sessions: state.sessions.map((s) => (s.id === editingSession.id ? { ...s, ...input } : s)),
      });
      setEditingSession(null);
    } else {
      onChange({ sessions: [...state.sessions, createSession(input)] });
    }
  }

  function deleteSession(id: string) {
    onChange({ sessions: state.sessions.filter((s) => s.id !== id) });
  }

  function saveSessionContent(updated: ScheduleSession) {
    onChange({ sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)) });
  }

  const sortedSessions = [...state.sessions].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const scheduledMinutes = totalScheduledMinutes(state.sessions);
  const remainingMinutes = Math.max(0, DAY_MINUTES - scheduledMinutes);
  const fullyPacked = state.sessions.length > 0 && remainingMinutes === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Timing</h2>
      <p className="text-sm text-muted-foreground">
        Build your day out of sessions — like dancehall in the morning, house from 10am to 2pm — then set how often this pattern repeats.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="start-date">Start date</Label>
          <Input id="start-date" type="date" value={state.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end-date">End date (Optional)</Label>
          <Input id="end-date" type="date" value={state.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label>Recurrence</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RECURRENCE_OPTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange({ recurrence: r.id })}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                state.recurrence === r.id
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {state.recurrence === "custom" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const selected = state.customDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border text-xs font-semibold transition-colors",
                    selected ? "border-violet-500 bg-violet-600 text-white" : "border-border text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          Advanced timing
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", advancedOpen && "rotate-180")} />
        </button>
        {advancedOpen && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Time zone</Label>
              <select
                value={state.timezone}
                onChange={(e) => onChange({ timezone: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-[15px] text-foreground"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Conflict handling</Label>
              <p className="text-xs text-muted-foreground">
                {state.overrideExisting
                  ? "This schedule will override conflicting schedules (set in Basic Details)."
                  : "This schedule will yield to higher-priority conflicting schedules."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Day Schedule</p>
            <p className="text-xs text-muted-foreground">
              {state.sessions.length === 0
                ? "No sessions yet — add one to start filling the day."
                : fullyPacked
                  ? "Fully scheduled for the day."
                  : `${formatDuration(scheduledMinutes)} scheduled · ${formatDuration(remainingMinutes)} remaining`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingSession(null);
              addDialog.show();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Plus className="size-4" />
            Add Session
          </button>
        </div>

        {state.sessions.length > 0 && (
          <div className="mt-3">
            <DayTimeline sessions={state.sessions} onSessionClick={setContentSession} />
          </div>
        )}

        <div className="mt-3 space-y-2">
          {sortedSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onOpenContent={() => setContentSession(session)}
              onEdit={() => {
                setEditingSession(session);
                addDialog.show();
              }}
              onDelete={() => deleteSession(session.id)}
            />
          ))}
          {state.sessions.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-input py-8 text-center">
              <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
            </div>
          )}
        </div>
      </div>

      <AddSessionDialog
        key={addDialog.dialogKey}
        open={addDialog.open}
        onOpenChange={(open) => {
          addDialog.onOpenChange(open);
          if (!open) setEditingSession(null);
        }}
        sessions={state.sessions}
        editing={editingSession ?? undefined}
        onSave={handleAddOrEditSave}
      />

      {contentSession && (
        <SessionContentDialog
          key={contentSession.id}
          session={contentSession}
          onOpenChange={(open) => !open && setContentSession(null)}
          onSave={saveSessionContent}
          businessContent={businessContent}
          businessAds={businessAds}
          businessPlaylists={businessPlaylists}
        />
      )}
    </div>
  );
}
