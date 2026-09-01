"use client";

import * as React from "react";

import { TRANSITIONS } from "../wizard-data";
import type { ScheduleSession } from "../schedule-state";
import { findOverlappingSession, formatTimeLabel } from "./session-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function AddSessionDialog({
  open,
  onOpenChange,
  sessions,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ScheduleSession[];
  editing?: ScheduleSession;
  onSave: (input: { label: string; startTime: string; endTime: string; transition: string }) => void;
}) {
  const [label, setLabel] = React.useState(editing?.label ?? "");
  const [startTime, setStartTime] = React.useState(editing?.startTime ?? "09:00");
  const [endTime, setEndTime] = React.useState(editing?.endTime ?? "12:00");
  const [transition, setTransition] = React.useState(editing?.transition ?? "Fade");
  const [error, setError] = React.useState("");

  function handleSave() {
    if (!label.trim()) {
      setError("Give this session a name, e.g. \"Morning Dancehall\".");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after the start time.");
      return;
    }
    const overlap = findOverlappingSession(sessions, startTime, endTime, editing?.id);
    if (overlap) {
      setError(`This overlaps with "${overlap.label}" (${formatTimeLabel(overlap.startTime)} – ${formatTimeLabel(overlap.endTime)}).`);
      return;
    }
    onSave({ label: label.trim(), startTime, endTime, transition });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Session" : "Add Session"}</DialogTitle>
          <DialogDescription>
            Block out a part of the day — like &quot;morning&quot; or &quot;happy hour&quot; — then choose what plays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-label">Session Name</Label>
            <Input
              id="session-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Morning Dancehall"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-start">Start time</Label>
              <Input id="session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-end">End time</Label>
              <Input id="session-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transition effect</Label>
            <Select value={transition} onValueChange={setTransition} items={TRANSITIONS} />
            <p className="text-xs text-muted-foreground">How content transitions within this session.</p>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" onClick={handleSave}>
            {editing ? "Save Changes" : "Add Session"}
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
