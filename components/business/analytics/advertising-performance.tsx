"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useAdAnalytics } from "@/components/business/advertisements/use-ad-analytics";
import { formatCompact, formatCount, formatKes, formatShortDate } from "@/components/business/advertisements/format";
import { TableSkeleton } from "./skeletons";

/**
 * The Analytics page's Advertising section — REAL data (real plays from
 * kiosks, estimated views/reach/revenue), unlike the rest of this page's
 * seeded preview numbers. Follows the page's date-range filter; location,
 * zone and room filters belong to the preview world, so drill-down lives on
 * Ad Performance instead.
 */
export function AdvertisingPerformance({ dateRange }: { dateRange: string }) {
  const { data, loading } = useAdAnalytics(dateRange);

  if (!data) return <TableSkeleton rows={4} />;

  const active = data.campaigns.filter((c) => c.status === "Active").length;
  const rows = data.campaigns
    .map((c) => ({ ...c, stats: data.byCampaign[c.id] }))
    .filter((c) => (c.stats?.plays ?? 0) > 0)
    .sort((a, b) => b.stats!.plays - a.stats!.plays)
    .slice(0, 6);
  const top = rows[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-5" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Advertising</h2>
          <p className="text-xs text-muted-foreground">
            Live data · {formatShortDate(data.fromDate)}
            {data.fromDate !== data.toDate && ` – ${formatShortDate(data.toDate)}`}
            {loading && " · updating…"}
          </p>
        </div>
        <Link
          href="/business/advertisements/performance"
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Ad Performance <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {!data.schemaReady && (
        <p className="mt-3 rounded-lg bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          Ad serving isn&apos;t enabled on the database yet, so there are no plays to report.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Ad Plays" value={formatCount(data.totals.plays)} />
        <Stat label="Est. Views" value={formatCompact(data.totals.views)} />
        <Stat label="Est. Reach" value={formatCompact(data.totals.reach)} />
        <Stat label="Est. Revenue" value={formatKes(data.totals.revenue)} />
        <Stat label="Active Campaigns" value={String(active)} sublabel={top ? `Top: ${top.name}` : undefined} />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Campaign Performance</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No ad plays in this period.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Campaign</th>
                    <th className="px-3 py-2 text-right font-medium">Plays</th>
                    <th className="px-3 py-2 text-right font-medium">Est. Reach</th>
                    <th className="px-3 py-2 text-right font-medium">Est. Revenue</th>
                    <th className="py-2 pl-3 text-right font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/business/advertisements/campaigns?campaign=${c.id}`} className="font-medium text-foreground hover:underline">
                          {c.name}
                        </Link>
                        {c.advertiser && <p className="text-xs text-muted-foreground">{c.advertiser}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatCount(c.stats!.plays)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(c.stats!.reach)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatKes(c.stats!.revenue)}</td>
                      <td className="py-2.5 pl-3 text-right font-mono text-emerald-400">{c.stats!.completionPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {rows.map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Plays</p>
                      <p className="font-mono text-foreground">{formatCount(c.stats!.plays)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Reach</p>
                      <p className="font-mono text-muted-foreground">{formatCount(c.stats!.reach)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completion</p>
                      <p className="font-mono text-emerald-400">{c.stats!.completionPct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-xl font-semibold text-foreground">{value}</p>
      {sublabel && <p className="truncate text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}
