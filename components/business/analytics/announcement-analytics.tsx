import { Pause, Volume1 } from "lucide-react";

import type { AnalyticsSnapshot } from "./data-engine";

export function AnnouncementAnalytics({ announcements }: { announcements: AnalyticsSnapshot["announcements"] }) {
  const max = Math.max(1, ...announcements.byDay.map((d) => d.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Announcements</h2>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-mono text-2xl font-semibold text-foreground">{announcements.total}</p>
        <p className="text-sm text-emerald-400">{announcements.deliveredPct}% successfully delivered</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-border p-3">
          <span className="grid size-8 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <Pause className="size-4" />
          </span>
          <div>
            <p className="font-mono text-lg font-semibold text-foreground">{announcements.pauseCount}</p>
            <p className="text-xs text-muted-foreground">Pause Music</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-border p-3">
          <span className="grid size-8 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <Volume1 className="size-4" />
          </span>
          <div>
            <p className="font-mono text-lg font-semibold text-foreground">{announcements.reduceCount}</p>
            <p className="text-xs text-muted-foreground">Reduce Volume</p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Announcement activity by day</p>
        <div className="flex items-end gap-1.5" role="img" aria-label="Announcements sent per day this period">
          {announcements.byDay.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-14 w-full items-end">
                <div className="w-full rounded-t-sm bg-violet-500/50" style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
