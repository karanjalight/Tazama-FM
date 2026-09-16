"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AdAnalytics, AdBreakdownRow, AdHeatCell } from "@/lib/business/ad-analytics";
import { AdPerformanceFilters, type AdPerformanceFilterValues } from "./ad-performance-filters";
import { AdsKpiCard } from "../ads-kpi-card";
import { AdsPerformanceChart } from "../ads-performance-chart";
import { EstimateInfo } from "../estimate-info";
import { formatCompact, formatCount, formatKes, trendOf } from "../format";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { ChartSkeleton, KpiCardSkeleton } from "@/components/business/analytics/skeletons";
import { TazamaInsightCard } from "@/components/business/analytics/tazama-insight-card";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TABLES = ["Rooms", "Screens", "Locations"] as const;

export function AdPerformanceWorkspace({
  analytics,
  filters,
  locations,
  campaigns,
}: {
  analytics: AdAnalytics;
  filters: AdPerformanceFilterValues;
  locations: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [table, setTable] = React.useState<(typeof TABLES)[number]>("Rooms");

  function updateFilters(patch: Partial<AdPerformanceFilterValues>) {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.range !== "Last 30 days") params.set("range", next.range);
    if (next.locationId) params.set("location", next.locationId);
    if (next.campaignId) params.set("campaign", next.campaignId);
    if (next.advertiser) params.set("advertiser", next.advertiser);
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  }

  const { totals, previous } = analytics;
  const perAiring = totals.airings ? totals.plays / totals.airings : 0;
  const rows = table === "Rooms" ? analytics.byRoom : table === "Screens" ? analytics.byScreen : analytics.byLocation;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertising Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real plays from your screens, with estimated views, reach and revenue for each room they aired in.
          </p>
        </div>
        <EstimateInfo />
      </header>

      <AdPerformanceFilters
        filters={filters}
        locations={locations}
        campaigns={campaigns}
        advertisers={analytics.advertisers}
        onChange={updateFilters}
      />

      {!analytics.schemaReady && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          Ad serving isn&apos;t enabled on the database yet. Run <code className="font-mono text-foreground">supabase/business-ad-serving.sql</code> in
          the Supabase SQL editor, and plays will start appearing here as screens air ads.
        </p>
      )}

      {pending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <AdsKpiCard label="Total Plays" value={formatCount(totals.plays)} trend={trendOf(totals.plays, previous.plays)} />
          <AdsKpiCard label="Airings" value={formatCount(totals.airings)} sublabel={perAiring ? `${perAiring.toFixed(1)} screens per airing` : undefined} />
          <AdsKpiCard label="Completion" value={totals.plays ? `${totals.completionPct}%` : "—"} sublabel={`${formatCount(totals.completed)} played to the end`} />
          <AdsKpiCard label="Views" value={formatCompact(totals.views)} estimated trend={trendOf(totals.views, previous.views)} />
          <AdsKpiCard label="Reach" value={formatCompact(totals.reach)} estimated trend={trendOf(totals.reach, previous.reach)} />
          <AdsKpiCard label="Revenue" value={formatKes(totals.revenue)} estimated trend={trendOf(totals.revenue, previous.revenue)} />
        </div>
      )}

      {pending ? <ChartSkeleton /> : <AdsPerformanceChart daily={analytics.daily} title="Daily trend" />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {pending ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Performance by Location</h2>
            <div className="mt-4">
              {analytics.byLocation.length ? (
                <HorizontalBars
                  items={analytics.byLocation.map((l) => ({ id: l.id, name: l.name, value: l.views }))}
                  formatValue={(v) => `${formatCount(v)} est. views`}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No plays in this period.</p>
              )}
            </div>
          </div>
        )}

        {pending ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">When ads play</h2>
            <p className="mb-4 text-sm text-muted-foreground">Plays by weekday and hour.</p>
            <PlaysHeatmap cells={analytics.heatmap} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Breakdown</h2>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Breakdown">
            {TABLES.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={table === t}
                onClick={() => setTable(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  table === t ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <BreakdownRows rows={rows} />
      </div>

      {analytics.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {analytics.insights.map((insight) => (
            <TazamaInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaysHeatmap({ cells }: { cells: AdHeatCell[] }) {
  const grid = new Map(cells.map((c) => [`${c.weekday}|${c.hour}`, c.plays]));
  const max = Math.max(0, ...cells.map((c) => c.plays));
  const activeHours = cells.map((c) => c.hour);
  const from = activeHours.length ? Math.max(0, Math.min(...activeHours) - 1) : 8;
  const to = activeHours.length ? Math.min(23, Math.max(...activeHours) + 1) : 22;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
  const level = (plays: number) => (max === 0 || plays === 0 ? 0 : Math.max(1, Math.ceil((plays / max) * 4)));
  const CLASS = ["bg-muted", "bg-violet-500/25", "bg-violet-500/50", "bg-violet-500/75", "bg-violet-500"];

  if (!cells.length) return <p className="py-6 text-center text-sm text-muted-foreground">No plays in this period.</p>;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-105">
        <div className="grid gap-1" style={{ gridTemplateColumns: `36px repeat(${hours.length}, minmax(0, 1fr))` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center text-[9px] text-muted-foreground">
              {h % 2 === from % 2 ? label(h) : ""}
            </div>
          ))}
          {DAYS.map((day, d) => (
            <React.Fragment key={day}>
              <div className="flex items-center text-[10px] text-muted-foreground">{day}</div>
              {hours.map((h) => {
                const plays = grid.get(`${d}|${h}`) ?? 0;
                return (
                  <div
                    key={h}
                    role="img"
                    aria-label={`${day} ${label(h)}: ${plays} plays`}
                    title={`${day} ${label(h)}: ${plays} plays`}
                    className={cn("aspect-square rounded-sm", CLASS[level(plays)])}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function BreakdownRows({ rows }: { rows: AdBreakdownRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No plays in this period.</p>;
  return (
    <>
      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Plays</th>
              <th className="px-3 py-2 text-right font-medium">Airings</th>
              <th className="px-3 py-2 text-right font-medium">Est. Views</th>
              <th className="px-3 py-2 text-right font-medium">Est. Reach</th>
              <th className="px-3 py-2 text-right font-medium">Est. Revenue</th>
              <th className="py-2 pl-3 text-right font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                <td className="max-w-72 py-2.5 pr-3">
                  <p className="truncate font-medium text-foreground">{r.name}</p>
                  {r.context && <p className="truncate text-xs text-muted-foreground">{r.context}</p>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatCount(r.plays)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.airings)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.views)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.reach)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatKes(r.revenue)}</td>
                <td className="py-2.5 pl-3 text-right font-mono text-emerald-400">{r.plays ? `${r.completionPct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-3 sm:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border/60 p-3">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            {r.context && <p className="truncate text-xs text-muted-foreground">{r.context}</p>}
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Plays</p>
                <p className="font-mono text-foreground">{formatCount(r.plays)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Views</p>
                <p className="font-mono text-foreground">{formatCount(r.views)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Revenue</p>
                <p className="font-mono text-foreground">{formatKes(r.revenue)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
