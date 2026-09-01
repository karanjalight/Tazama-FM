"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { DEFAULT_FILTERS, DATE_RANGES, type AnalyticsFilters } from "@/components/business/analytics/types";
import { generateAnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { ChartSkeleton, HeatmapSkeleton, InsightCardSkeleton, KpiCardSkeleton, TableSkeleton } from "@/components/business/analytics/skeletons";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { Select } from "@/components/ui/select";
import { AudienceKpiCard } from "./audience-kpi-card";
import { PrivacyNotice } from "./privacy-notice";
import { AudienceHeatmapSection } from "./audience-heatmap-section";
import { PeakHoursSection } from "./peak-hours-section";
import { LocationAudience } from "./location-audience";
import { ScreenAttention } from "./screen-attention";
import { ContentAudienceCorrelation } from "./content-audience-correlation";
import { AudienceInsightCard } from "./audience-insight-card";

const HAS_ENOUGH_DATA = true;

export function AudienceWorkspace() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = React.useState(false);

  const snapshot = React.useMemo(() => generateAnalyticsSnapshot(filters), [filters]);

  React.useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, [loading]);

  function updateDateRange(dateRange: string) {
    setFilters((f) => ({ ...f, dateRange: dateRange as AnalyticsFilters["dateRange"] }));
    setLoading(true);
  }

  if (!HAS_ENOUGH_DATA) {
    return (
      <AnalyticsEmptyState
        icon={Users}
        title="Audience Insights are building"
        description="Tazama needs enough aggregate activity data before meaningful patterns can be shown."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audience Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">Understand aggregate audience activity across your Tazama network.</p>
        </div>
        <Select value={filters.dateRange} onValueChange={updateDateRange} items={DATE_RANGES} className="h-9 w-40 rounded-lg text-sm" />
      </header>

      <PrivacyNotice />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <AudienceKpiCard label="Estimated Audience" value={snapshot.audienceKpis.estimatedAudience.toLocaleString()} sublabel="Estimate" />
            <AudienceKpiCard label="Peak Activity" value={snapshot.audienceKpis.peakActivityLabel} />
            <AudienceKpiCard label="Avg. Session Activity" value={`${snapshot.audienceKpis.avgSessionMinutes} min`} sublabel="Estimate" />
            <AudienceKpiCard label="Most Active Location" value={snapshot.audienceKpis.mostActiveLocation} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? <HeatmapSkeleton /> : <AudienceHeatmapSection cells={snapshot.heatmap} />}
        {loading ? <ChartSkeleton /> : <PeakHoursSection bars={snapshot.peakHours} peakPeriodLabel={snapshot.peakPeriodLabel} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? <TableSkeleton rows={3} /> : <LocationAudience bars={snapshot.locationAudience} locations={snapshot.locationPerformance} />}
        {loading ? <TableSkeleton rows={4} /> : <ScreenAttention rows={snapshot.screenAttention} />}
      </div>

      {loading ? <TableSkeleton rows={4} /> : <ContentAudienceCorrelation items={snapshot.contentAudience} />}

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Audience Insights</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <InsightCardSkeleton key={i} />)
            : snapshot.audienceInsights.map((insight) => <AudienceInsightCard key={insight.id} insight={insight} />)}
        </div>
      </div>
    </div>
  );
}
