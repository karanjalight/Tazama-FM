"use client";

import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { TableSkeleton } from "@/components/business/analytics/skeletons";
import { useAdAnalytics } from "@/components/business/advertisements/use-ad-analytics";
import { formatCount, formatKes, formatShortDate } from "@/components/business/advertisements/format";
import { ESTIMATE_ASSUMPTIONS } from "@/lib/business/ad-estimates";
import { ReportDocumentShell, ReportSection, ReportStatCard, ReportStatGrid, ReportTwoColumn } from "./report-document-shell";

/** Advertising report over REAL ad data for the selected date range. */
export function AdvertisingReportView({ dateRangeLabel }: { dateRangeLabel: string }) {
  const { data, loading } = useAdAnalytics(dateRangeLabel);

  if (!data) return <TableSkeleton rows={6} />;

  const { totals } = data;
  const rows = data.campaigns
    .map((c) => ({ ...c, stats: data.byCampaign[c.id] }))
    .filter((c) => (c.stats?.plays ?? 0) > 0)
    .sort((a, b) => b.stats!.plays - a.stats!.plays);
  const active = data.campaigns.filter((c) => c.status === "Active").length;
  const top = rows[0];
  const rangeText = `${formatShortDate(data.fromDate)}${data.fromDate !== data.toDate ? ` – ${formatShortDate(data.toDate)}` : ""}`;

  return (
    <div aria-busy={loading}>
      <ReportDocumentShell title="Advertising Report" dateRangeLabel={`${dateRangeLabel} (${rangeText})`}>
        <ReportSection title="Executive Summary" first>
          <ReportStatGrid>
            <ReportStatCard label="Ad Plays" value={formatCount(totals.plays)} />
            <ReportStatCard label="Airings" value={formatCount(totals.airings)} />
            <ReportStatCard label="Estimated Views" value={formatCount(totals.views)} />
            <ReportStatCard label="Estimated Reach" value={formatCount(totals.reach)} />
            <ReportStatCard label="Estimated Revenue" value={formatKes(totals.revenue)} />
            <ReportStatCard label="Completion" value={totals.plays ? `${totals.completionPct}%` : "—"} />
            <ReportStatCard label="Active Campaigns" value={String(active)} />
            <ReportStatCard label="Top Campaign" value={top?.name ?? "—"} />
          </ReportStatGrid>
          {!data.schemaReady && (
            <p className="mt-3 text-xs text-muted-foreground">
              Ad serving isn&apos;t enabled on the database yet (supabase/business-ad-serving.sql), so no plays have been recorded.
            </p>
          )}
        </ReportSection>

        <ReportTwoColumn
          left={
            <ReportSection title="Campaign Performance" first>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ad plays in this period.</p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-1.5 pr-3 font-medium">Campaign</th>
                          <th className="px-3 py-1.5 text-right font-medium">Plays</th>
                          <th className="px-3 py-1.5 text-right font-medium">Est. Reach</th>
                          <th className="px-3 py-1.5 text-right font-medium">Est. Revenue</th>
                          <th className="py-1.5 pl-3 text-right font-medium">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((c) => (
                          <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                            <td className="py-2 pr-3 text-foreground">
                              {c.name}
                              {c.advertiser && <span className="text-xs text-muted-foreground"> · {c.advertiser}</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-foreground">{formatCount(c.stats!.plays)}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCount(c.stats!.reach)}</td>
                            <td className="px-3 py-2 text-right font-mono text-foreground">{formatKes(c.stats!.revenue)}</td>
                            <td className="py-2 pl-3 text-right font-mono text-emerald-400">{c.stats!.completionPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 sm:hidden">
                    {rows.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border/60 p-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Plays</p>
                            <p className="font-mono text-foreground">{formatCount(c.stats!.plays)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Est. Reach</p>
                            <p className="font-mono text-muted-foreground">{formatCount(c.stats!.reach)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Est. Revenue</p>
                            <p className="font-mono text-foreground">{formatKes(c.stats!.revenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ReportSection>
          }
          right={
            <ReportSection title="Plays by Location" first>
              {data.byLocation.length ? (
                <HorizontalBars
                  items={data.byLocation.map((l) => ({ id: l.id, name: l.name, value: l.plays }))}
                  formatValue={(v) => `${formatCount(v)} plays`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No plays recorded.</p>
              )}
            </ReportSection>
          }
        />

        <ReportSection title="Key Insights">
          {data.insights.length ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
              {data.insights.map((i) => (
                <li key={i.id}>{i.body}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Insights appear once ads have played in this period.</p>
          )}
        </ReportSection>

        <ReportSection title="Methodology">
          <p className="mb-2 text-sm text-muted-foreground">
            Plays are counted from the screens that actually showed each ad. Views, reach and revenue are estimates:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {ESTIMATE_ASSUMPTIONS.map((a) => (
              <li key={a.label}>
                <span className="font-medium">{a.label}:</span> {a.detail}
              </li>
            ))}
          </ul>
        </ReportSection>
      </ReportDocumentShell>
    </div>
  );
}
