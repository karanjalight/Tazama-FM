"use client";

import * as React from "react";

import { DEFAULT_AD_FILTERS, generateAdSnapshot, type AdFilters } from "../data-engine";
import { AdPerformanceFilters } from "./ad-performance-filters";
import { AdsKpiCard } from "../ads-kpi-card";
import { ActivityHeatmap } from "@/components/business/analytics/charts/activity-heatmap";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { ChartSkeleton, KpiCardSkeleton } from "@/components/business/analytics/skeletons";

export function AdPerformanceWorkspace() {
  const [filters, setFilters] = React.useState<AdFilters>(DEFAULT_AD_FILTERS);
  const [loading, setLoading] = React.useState(false);

  const snapshot = React.useMemo(() => generateAdSnapshot(filters), [filters]);

  React.useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, [loading]);

  function updateFilters(patch: Partial<AdFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setLoading(true);
  }

  const locationBars = snapshot.byLocation.map((l) => ({ id: l.id, name: l.name, value: l.plays }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertising Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Understand how your advertising is performing across the network.</p>
      </header>

      <AdPerformanceFilters filters={filters} onChange={updateFilters} />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AdsKpiCard label="Total Plays" value={snapshot.totalPlays.toLocaleString()} />
          <AdsKpiCard label="Estimated Reach" value={snapshot.estimatedReach.toLocaleString()} />
          <AdsKpiCard label="Completion" value={`${snapshot.completionPct}%`} />
          <AdsKpiCard label="Avg. Frequency" value={String(snapshot.avgFrequency)} />
          <AdsKpiCard label="Estimated Revenue" value={`KES ${snapshot.estimatedRevenue.toLocaleString()}`} sublabel="Estimated" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Performance by Location</h2>
            <div className="mt-4">
              <HorizontalBars items={locationBars} formatValue={(v) => `${v.toLocaleString()} plays`} />
            </div>
          </div>
        )}

        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Advertising Activity</h2>
            <p className="mb-4 text-sm text-muted-foreground">When ads are most active across the network.</p>
            <ActivityHeatmap cells={snapshot.heatmap} summary="Advertising activity is highest in the afternoon and evening across most days." />
          </div>
        )}
      </div>
    </div>
  );
}
