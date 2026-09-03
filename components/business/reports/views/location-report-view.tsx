import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { ReportDocumentShell, ReportSection, ReportStatCard, ReportStatGrid, ReportTwoColumn } from "./report-document-shell";

export function LocationReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  const top = snapshot.locationPerformance.reduce((a, b) => (b.reach > a.reach ? b : a));
  const reachBars = snapshot.locationPerformance.map((l) => ({ id: l.id, name: l.name, value: l.reach }));

  return (
    <ReportDocumentShell title="Location Report" dateRangeLabel={dateRangeLabel}>
      <ReportSection title="Executive Summary" first>
        <ReportStatGrid>
          <ReportStatCard label="Locations" value={String(snapshot.locationPerformance.length)} />
          <ReportStatCard label="Screens" value={String(snapshot.locationPerformance.reduce((s, l) => s + l.screens, 0))} />
          <ReportStatCard label="Avg. Uptime" value={`${snapshot.screenSummary.uptimePct}%`} />
          <ReportStatCard label="Top Location" value={top.name} />
        </ReportStatGrid>
      </ReportSection>

      <ReportTwoColumn
        left={
          <ReportSection title="Location Performance" first>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Location</th>
                    <th className="px-3 py-1.5 text-right font-medium">Screens</th>
                    <th className="px-3 py-1.5 text-right font-medium">Uptime</th>
                    <th className="px-3 py-1.5 text-right font-medium">Plays</th>
                    <th className="py-1.5 pl-3 text-right font-medium">Ad Plays</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.locationPerformance.map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-3 text-foreground">{l.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{l.screens}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">{l.uptimePct}%</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{l.plays.toLocaleString()}</td>
                      <td className="py-2 pl-3 text-right font-mono text-muted-foreground">{l.adPlays.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {snapshot.locationPerformance.map((l) => (
                <div key={l.id} className="rounded-xl border border-border/60 p-3">
                  <p className="font-medium text-foreground">{l.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Screens</p>
                      <p className="font-mono text-muted-foreground">{l.screens}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uptime</p>
                      <p className="font-mono text-emerald-400">{l.uptimePct}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plays</p>
                      <p className="font-mono text-foreground">{l.plays.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ad Plays</p>
                      <p className="font-mono text-muted-foreground">{l.adPlays.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        }
        right={
          <ReportSection title="Estimated Reach by Location" first>
            <HorizontalBars items={reachBars} />
          </ReportSection>
        }
      />

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>{top.name} generated the highest estimated reach this period.</li>
          <li>Average uptime across all locations is {snapshot.screenSummary.uptimePct}%.</li>
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
