import type { ScheduleSession } from "../schedule-state";
import { sessionColorClass, toMinutes } from "./session-utils";
import { cn } from "@/lib/utils";

const DAY_MINUTES = 24 * 60;
const HOUR_MARKS = [0, 6, 12, 18, 24];

export function DayTimeline({
  sessions,
  onSessionClick,
}: {
  sessions: ScheduleSession[];
  onSessionClick: (session: ScheduleSession) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="relative h-11 overflow-hidden rounded-lg bg-muted/50">
        {sessions.map((session) => {
          const start = toMinutes(session.startTime);
          const end = Math.max(start + 1, toMinutes(session.endTime));
          const left = (start / DAY_MINUTES) * 100;
          const width = ((end - start) / DAY_MINUTES) * 100;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSessionClick(session)}
              title={session.label}
              className={cn(
                "absolute top-0 h-full overflow-hidden border-r border-background/60 text-left transition-opacity hover:opacity-90",
                sessionColorClass(session),
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {width > 6 && (
                <span className="block truncate px-1.5 py-1 text-[10px] font-medium text-white">{session.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        {HOUR_MARKS.map((h) => (
          <span key={h}>{h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}</span>
        ))}
      </div>
    </div>
  );
}
