"use client";

/**
 * The interactive day-timeline — click/drag on the Pointer Events API, no
 * drag library (matches this codebase's established "raw DOM/SVG, no new
 * dependency" convention). Three interactions, all clamped to a 5-minute
 * grid and to whichever free "gap" (see `freeGapAround`, session-utils.ts)
 * the drag started in, so a block can never end up overlapping a neighbor:
 *
 *  - Click/drag an EMPTY gap  -> `onCreateBlock` (a new content-only block).
 *  - Click an EXISTING block  -> `onSessionClick` (opens the full dialog,
 *    unchanged from before this component became interactive).
 *  - Drag an EXISTING block's body -> `onMoveOrResize` (same duration, new position).
 *  - Drag an EXISTING block's edge handle -> `onMoveOrResize` (that edge only).
 *
 * "Click" vs "drag" is decided by total pointer movement (a few px), not by
 * which handler fired — the same pointerdown/up pair backs both.
 */
import * as React from "react";

import type { ScheduleSession } from "../schedule-state";
import { DAY_MINUTES, freeGapAround, minutesToHHMM, sessionColorClass, toMinutes } from "./session-utils";
import { cn } from "@/lib/utils";

const HOUR_MARKS = [0, 6, 12, 18, 24];
const SNAP_MINUTES = 5;
const DEFAULT_BLOCK_MINUTES = 30;
const MIN_BLOCK_MINUTES = 5;
const CLICK_THRESHOLD_PX = 4;

type Gap = { start: number; end: number };

type DragState =
  | { kind: "create"; anchorMinutes: number; gap: Gap; currentStart: number; currentEnd: number }
  | { kind: "move"; sessionId: string; gap: Gap; duration: number; grabOffsetMinutes: number; currentStart: number; currentEnd: number }
  | { kind: "resize"; sessionId: string; edge: "start" | "end"; gap: Gap; currentStart: number; currentEnd: number };

function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function DayTimeline({
  sessions,
  onSessionClick,
  onCreateBlock,
  onMoveOrResize,
}: {
  sessions: ScheduleSession[];
  onSessionClick: (session: ScheduleSession) => void;
  onCreateBlock: (range: { startTime: string; endTime: string }) => void;
  onMoveOrResize: (sessionId: string, range: { startTime: string; endTime: string }) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const startXRef = React.useRef<number | null>(null);

  function minutesFromClientX(clientX: number): number {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    return snap(fraction * DAY_MINUTES);
  }

  function otherSessions(excludeId: string | null) {
    return excludeId ? sessions.filter((s) => s.id !== excludeId) : sessions;
  }

  /* ------------------------------- create drag ------------------------------ */

  function handleTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // a block/handle already handled this
    const anchor = minutesFromClientX(e.clientX);
    const gap = freeGapAround(anchor, sessions);
    if (gap.end - gap.start < MIN_BLOCK_MINUTES) return; // no room here
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setDrag({ kind: "create", anchorMinutes: anchor, gap, currentStart: anchor, currentEnd: anchor });
  }

  /* -------------------------- move / resize (existing block) ---------------- */

  function handleBlockPointerDown(e: React.PointerEvent<HTMLDivElement>, session: ScheduleSession) {
    e.stopPropagation();
    // Capture on the TRACK, not this block — handlePointerMove/Up are only
    // wired up on the track element, so capture has to redirect there
    // regardless of which element the drag actually started on, or these
    // events would fire on the block (which has no move/up handlers at all)
    // and the drag would silently never update past pointerdown.
    trackRef.current?.setPointerCapture(e.pointerId);
    const startM = toMinutes(session.startTime);
    const endM = toMinutes(session.endTime);
    const gap = freeGapAround(startM, otherSessions(session.id));
    const pointerM = minutesFromClientX(e.clientX);
    startXRef.current = e.clientX;
    setDrag({
      kind: "move",
      sessionId: session.id,
      gap,
      duration: endM - startM,
      grabOffsetMinutes: pointerM - startM,
      currentStart: startM,
      currentEnd: endM,
    });
  }

  function handleEdgePointerDown(e: React.PointerEvent<HTMLDivElement>, session: ScheduleSession, edge: "start" | "end") {
    e.stopPropagation();
    trackRef.current?.setPointerCapture(e.pointerId); // see the note in handleBlockPointerDown
    const startM = toMinutes(session.startTime);
    const endM = toMinutes(session.endTime);
    const gap = freeGapAround(startM, otherSessions(session.id));
    startXRef.current = e.clientX;
    setDrag({ kind: "resize", sessionId: session.id, edge, gap, currentStart: startM, currentEnd: endM });
  }

  /* --------------------------------- move/up --------------------------------- */

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const pos = minutesFromClientX(e.clientX);

    if (drag.kind === "create") {
      const start = Math.max(drag.gap.start, Math.min(drag.anchorMinutes, pos));
      const end = Math.min(drag.gap.end, Math.max(drag.anchorMinutes, pos));
      setDrag({ ...drag, currentStart: start, currentEnd: end });
    } else if (drag.kind === "move") {
      const rawStart = pos - drag.grabOffsetMinutes;
      const start = Math.max(drag.gap.start, Math.min(drag.gap.end - drag.duration, rawStart));
      setDrag({ ...drag, currentStart: start, currentEnd: start + drag.duration });
    } else {
      if (drag.edge === "start") {
        const start = Math.max(drag.gap.start, Math.min(pos, drag.currentEnd - MIN_BLOCK_MINUTES));
        setDrag({ ...drag, currentStart: start });
      } else {
        const end = Math.min(drag.gap.end, Math.max(pos, drag.currentStart + MIN_BLOCK_MINUTES));
        setDrag({ ...drag, currentEnd: end });
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const movedPx = Math.abs(e.clientX - (startXRef.current ?? e.clientX));
    const isClick = movedPx < CLICK_THRESHOLD_PX;

    if (drag.kind === "create") {
      let start = drag.currentStart;
      let end = drag.currentEnd;
      if (isClick) {
        start = drag.anchorMinutes;
        end = Math.min(drag.gap.end, start + DEFAULT_BLOCK_MINUTES);
        if (end - start < MIN_BLOCK_MINUTES) start = Math.max(drag.gap.start, end - DEFAULT_BLOCK_MINUTES);
      }
      if (end - start >= MIN_BLOCK_MINUTES) {
        onCreateBlock({ startTime: minutesToHHMM(start), endTime: minutesToHHMM(end) });
      }
    } else if (drag.kind === "move") {
      if (isClick) {
        const session = sessions.find((s) => s.id === drag.sessionId);
        if (session) onSessionClick(session);
      } else {
        onMoveOrResize(drag.sessionId, { startTime: minutesToHHMM(drag.currentStart), endTime: minutesToHHMM(drag.currentEnd) });
      }
    } else if (drag.kind === "resize" && !isClick) {
      onMoveOrResize(drag.sessionId, { startTime: minutesToHHMM(drag.currentStart), endTime: minutesToHHMM(drag.currentEnd) });
    }

    setDrag(null);
    startXRef.current = null;
  }

  /* --------------------------------- render ----------------------------------- */

  const dragOverride = drag && drag.kind !== "create" ? { id: drag.sessionId, start: drag.currentStart, end: drag.currentEnd } : null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDrag(null);
          startXRef.current = null;
        }}
        className="relative h-11 touch-none overflow-hidden rounded-lg bg-muted/50 select-none"
      >
        {sessions.map((session) => {
          const overridden = dragOverride?.id === session.id;
          const start = overridden ? dragOverride.start : toMinutes(session.startTime);
          const end = overridden ? dragOverride.end : Math.max(start + 1, toMinutes(session.endTime));
          const left = (start / DAY_MINUTES) * 100;
          const width = ((end - start) / DAY_MINUTES) * 100;
          return (
            <div
              key={session.id}
              onPointerDown={(e) => handleBlockPointerDown(e, session)}
              title={session.label}
              className={cn(
                "group absolute top-0 h-full touch-none cursor-grab overflow-hidden border-r border-background/60 text-left transition-opacity active:cursor-grabbing",
                overridden ? "opacity-90" : "hover:opacity-90",
                sessionColorClass(session),
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {width > 6 && (
                <span className="pointer-events-none block truncate px-1.5 py-1 text-[10px] font-medium text-white">{session.label}</span>
              )}
              {/* Resize handles — narrow hit-zones at each edge, only really
                  discoverable/usable on a wide-enough block. */}
              <div
                onPointerDown={(e) => handleEdgePointerDown(e, session, "start")}
                className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30"
              />
              <div
                onPointerDown={(e) => handleEdgePointerDown(e, session, "end")}
                className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30"
              />
            </div>
          );
        })}

        {drag?.kind === "create" && drag.currentEnd > drag.currentStart && (
          <div
            className="pointer-events-none absolute top-0 h-full border-r border-background/60 bg-violet-500/50"
            style={{ left: `${(drag.currentStart / DAY_MINUTES) * 100}%`, width: `${((drag.currentEnd - drag.currentStart) / DAY_MINUTES) * 100}%` }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        {HOUR_MARKS.map((h) => (
          <span key={h}>{h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}</span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Click or drag an empty gap to place content · drag a block to move it · drag its edge to resize.
      </p>
    </div>
  );
}
