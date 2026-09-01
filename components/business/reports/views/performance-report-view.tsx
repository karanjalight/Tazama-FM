import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { PerformanceChart } from "@/components/business/analytics/charts/performance-chart";
import { AnalyticsKpiCard } from "@/components/business/analytics/analytics-kpi-card";
import { ScreenHealthRing } from "@/components/business/analytics/charts/screen-health-ring";
import { ReportDocumentShell, ReportSection, ReportTwoColumn } from "./report-document-shell";

export function PerformanceReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  return (
    <ReportDocumentShell title="Performance Report" dateRangeLabel={dateRangeLabel}>
      <ReportSection title="Executive Summary" first>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {snapshot.kpis.map((kpi, i) => (
            <AnalyticsKpiCard key={kpi.key} kpi={kpi} delayMs={i * 40} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Audience & Content Activity">
        <PerformanceChart series={snapshot.weeklySeries} />
      </ReportSection>

      <ReportTwoColumn
        left={
          <ReportSection title="Content Performance" first>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Content</th>
                  <th className="px-3 py-1.5 text-right font-medium">Plays</th>
                  <th className="px-3 py-1.5 text-right font-medium">Reach</th>
                  <th className="py-1.5 pl-3 text-right font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.contentPerformance.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-3 text-foreground">{c.title}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{c.plays.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{c.reach.toLocaleString()}</td>
                    <td className={`py-2 pl-3 text-right font-mono ${c.trendPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {c.trendPct >= 0 ? "+" : ""}
                      {c.trendPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        }
        right={
          <ReportSection title="Location Performance" first>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Location</th>
                  <th className="px-3 py-1.5 text-right font-medium">Screens</th>
                  <th className="px-3 py-1.5 text-right font-medium">Uptime</th>
                  <th className="py-1.5 pl-3 text-right font-medium">Reach</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.locationPerformance.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-3 text-foreground">{l.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{l.screens}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{l.uptimePct}%</td>
                    <td className="py-2 pl-3 text-right font-mono text-muted-foreground">{l.reach.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        }
      />

      <ReportSection title="Screen Health">
        <ScreenHealthRing {...snapshot.screenSummary} />
      </ReportSection>

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>Audience activity peaked between {snapshot.peakPeriodLabel}.</li>
          <li>{snapshot.audienceKpis.mostActiveLocation} generated the highest activity.</li>
          <li>{snapshot.contentPerformance[0].title} was the top performing content.</li>
          <li>Screen uptime averaged {snapshot.screenSummary.uptimePct}% across {snapshot.screens.length} screens.</li>
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
