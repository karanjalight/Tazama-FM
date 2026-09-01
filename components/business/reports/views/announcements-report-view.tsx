import { Pause, Volume1 } from "lucide-react";

import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { ReportDocumentShell, ReportSection, ReportStatCard, ReportStatGrid, ReportTwoColumn } from "./report-document-shell";

export function AnnouncementsReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  const { announcements } = snapshot;
  const max = Math.max(1, ...announcements.byDay.map((d) => d.count));

  return (
    <ReportDocumentShell title="Announcements Report" dateRangeLabel={dateRangeLabel}>
      <ReportSection title="Executive Summary" first>
        <ReportStatGrid>
          <ReportStatCard label="Announcements Sent" value={String(announcements.total)} />
          <ReportStatCard label="Delivered" value={`${announcements.deliveredPct}%`} />
          <ReportStatCard label="Pause Music" value={String(announcements.pauseCount)} />
          <ReportStatCard label="Reduce Volume" value={String(announcements.reduceCount)} />
        </ReportStatGrid>
      </ReportSection>

      <ReportTwoColumn
        left={
          <ReportSection title="Announcement Activity by Day" first>
            <div className="flex items-end gap-2" role="img" aria-label="Announcements sent per day this period">
              {announcements.byDay.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-full items-end">
                    <div className="w-full rounded-t-sm bg-violet-500/60" style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </ReportSection>
        }
        right={
          <ReportSection title="Playback Mode Split" first>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-400">
                  <Pause className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Pause Music</span>
                    <span className="font-mono text-muted-foreground">{announcements.pauseCount}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(announcements.pauseCount / announcements.total) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-400">
                  <Volume1 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Reduce Volume</span>
                    <span className="font-mono text-muted-foreground">{announcements.reduceCount}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(announcements.reduceCount / announcements.total) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </ReportSection>
        }
      />

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>{announcements.deliveredPct}% of announcements were delivered successfully.</li>
          <li>
            Pause Music is used {Math.round((announcements.pauseCount / announcements.total) * 100)}% of the time, Reduce Volume the
            remaining {Math.round((announcements.reduceCount / announcements.total) * 100)}%.
          </li>
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
