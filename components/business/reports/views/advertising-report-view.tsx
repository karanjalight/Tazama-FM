import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { ReportDocumentShell, ReportSection, ReportStatCard, ReportStatGrid, ReportTwoColumn } from "./report-document-shell";

export function AdvertisingReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  const { advertising } = snapshot;
  const campaignBars = advertising.campaigns.map((c) => ({ id: c.id, name: c.name, value: c.plays }));

  return (
    <ReportDocumentShell title="Advertising Report" dateRangeLabel={dateRangeLabel}>
      <ReportSection title="Executive Summary" first>
        <ReportStatGrid>
          <ReportStatCard label="Ad Plays" value={advertising.adPlays.toLocaleString()} />
          <ReportStatCard label="Estimated Reach" value={advertising.estimatedReach.toLocaleString()} />
          <ReportStatCard label="Active Campaigns" value={String(advertising.activeCampaigns)} />
          <ReportStatCard label="Top Campaign" value={advertising.topCampaign} />
        </ReportStatGrid>
      </ReportSection>

      <ReportTwoColumn
        left={
          <ReportSection title="Campaign Performance" first>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Campaign</th>
                    <th className="px-3 py-1.5 text-right font-medium">Plays</th>
                    <th className="px-3 py-1.5 text-right font-medium">Reach</th>
                    <th className="py-1.5 pl-3 text-right font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {advertising.campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-3 text-foreground">{c.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{c.plays.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{c.reach.toLocaleString()}</td>
                      <td className="py-2 pl-3 text-right font-mono text-emerald-400">{c.completionPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {advertising.campaigns.map((c) => (
                <div key={c.id} className="rounded-xl border border-border/60 p-3">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Plays</p>
                      <p className="font-mono text-foreground">{c.plays.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reach</p>
                      <p className="font-mono text-muted-foreground">{c.reach.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completion</p>
                      <p className="font-mono text-emerald-400">{c.completionPct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        }
        right={
          <ReportSection title="Plays by Campaign" first>
            <HorizontalBars items={campaignBars} />
          </ReportSection>
        }
      />

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>{advertising.topCampaign} is your strongest campaign this period.</li>
          <li>Campaigns reached an estimated {advertising.estimatedReach.toLocaleString()} people across {advertising.activeCampaigns} active placements.</li>
          <li>Average completion rate is {Math.round(advertising.campaigns.reduce((s, c) => s + c.completionPct, 0) / advertising.campaigns.length)}%.</li>
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
