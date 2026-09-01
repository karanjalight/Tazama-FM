import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { ScreenHealthRing } from "@/components/business/analytics/charts/screen-health-ring";
import { ReportDocumentShell, ReportSection, ReportTwoColumn } from "./report-document-shell";
import { cn } from "@/lib/utils";

const STATUS_META = {
  online: { label: "Online", text: "text-emerald-400" },
  offline: { label: "Offline", text: "text-rose-400" },
  attention: { label: "Attention", text: "text-amber-400" },
} as const;

export function ScreenHealthReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  const flagged = snapshot.screens.filter((s) => s.status !== "online");

  return (
    <ReportDocumentShell title="Screen Health Report" dateRangeLabel={dateRangeLabel}>
      <ReportTwoColumn
        left={
          <ReportSection title="Executive Summary" first>
            <ScreenHealthRing {...snapshot.screenSummary} />
          </ReportSection>
        }
        right={
          <ReportSection title="Needs Attention" first>
            {flagged.length > 0 ? (
              <div className="space-y-2">
                {flagged.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-sm">
                    <span className="text-foreground">
                      {s.name} <span className="text-muted-foreground">· {s.location}</span>
                    </span>
                    <span className={cn("text-xs font-semibold", STATUS_META[s.status].text)}>{STATUS_META[s.status].label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All screens are online with healthy uptime this period.</p>
            )}
          </ReportSection>
        }
      />

      <ReportSection title="Device Performance">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Screen</th>
              <th className="px-3 py-1.5 font-medium">Location</th>
              <th className="px-3 py-1.5 text-right font-medium">Uptime</th>
              <th className="py-1.5 pl-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.screens.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                <td className="py-2 pr-3 text-foreground">{s.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.location}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.uptimePct != null ? `${s.uptimePct}%` : "—"}</td>
                <td className={cn("py-2 pl-3 text-right font-medium", STATUS_META[s.status].text)}>{STATUS_META[s.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>Average uptime is {snapshot.screenSummary.uptimePct}% across {snapshot.screens.length} screens.</li>
          {flagged.length > 0 ? (
            flagged.map((s) => (
              <li key={s.id}>
                {s.name} at {s.location} is {s.status === "offline" ? "currently offline" : "experiencing lower uptime than other screens"}.
              </li>
            ))
          ) : (
            <li>All screens are online with healthy uptime this period.</li>
          )}
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
