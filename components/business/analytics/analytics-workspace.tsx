"use client";

import * as React from "react";
import { toast } from "sonner";
import { AudioLines, BarChart3, ChevronDown, Download, MonitorX } from "lucide-react";

import { DEFAULT_FILTERS, type AnalyticsFilters } from "./types";
import { generateAnalyticsSnapshot } from "./data-engine";
import { AnalyticsFiltersBar } from "./analytics-filters-bar";
import { AnalyticsKpiCard } from "./analytics-kpi-card";
import { PerformanceChart } from "./charts/performance-chart";
import { ContentPerformanceTable } from "./content-performance-table";
import { LocationPerformance } from "./location-performance";
import { ScreenHealth } from "./screen-health";
import { AdvertisingPerformance } from "./advertising-performance";
import { AnnouncementAnalytics } from "./announcement-analytics";
import { TazamaInsightCard } from "./tazama-insight-card";
import { AnalyticsEmptyState } from "./empty-state";
import { ChartSkeleton, InsightCardSkeleton, KpiCardSkeleton, TableSkeleton } from "./skeletons";
import { TazamaAnalyticsAssistant } from "./assistant/tazama-analytics-assistant";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const HAS_DATA = true;

export function AnalyticsWorkspace() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  const snapshot = React.useMemo(() => generateAnalyticsSnapshot(filters), [filters]);

  React.useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, [loading]);

  function updateFilters(patch: Partial<AnalyticsFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setLoading(true);
  }

  function handleExport(format: "PDF" | "CSV") {
    setExportOpen(false);
    toast.info(`${format} export isn't wired up yet`, { description: "This is a UI preview — export will be available later." });
  }

  function handleAssistantAction(label: string) {
    toast.info(label, { description: "This action isn't wired up in this preview yet." });
  }

  const assistantPanel = (
    <TazamaAnalyticsAssistant snapshot={snapshot} onAction={handleAssistantAction} onMinimize={() => setAssistantOpen(false)} />
  );

  if (!HAS_DATA) {
    return (
      <AnalyticsEmptyState
        icon={MonitorX}
        title="No analytics yet"
        description="Once your screens begin playing content, Tazama will start building your performance history."
        ctaLabel="Connect screens"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Understand how your Tazama network is performing.</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download className="size-4" />
            Export
            <ChevronDown className="size-3.5" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-32 rounded-xl border border-border bg-popover p-1.5 shadow-lift">
              {(["PDF", "CSV"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleExport(f)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <AnalyticsFiltersBar filters={filters} onChange={updateFilters} />

      <div className={cn("grid items-start gap-6", assistantOpen && "xl:grid-cols-[1fr_320px]")}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
              : snapshot.kpis.map((kpi, i) => <AnalyticsKpiCard key={kpi.key} kpi={kpi} delayMs={i * 40} />)}
          </div>

          {loading ? <ChartSkeleton /> : <PerformanceChart series={snapshot.weeklySeries} />}

          {loading ? <TableSkeleton rows={6} /> : <ContentPerformanceTable rows={snapshot.contentPerformance} />}

          {loading ? <TableSkeleton rows={3} /> : <LocationPerformance rows={snapshot.locationPerformance} />}

          {loading ? <TableSkeleton rows={5} /> : <ScreenHealth screens={snapshot.screens} summary={snapshot.screenSummary} />}

          {loading ? <TableSkeleton rows={4} /> : <AdvertisingPerformance advertising={snapshot.advertising} />}

          {loading ? <ChartSkeleton height="h-32" /> : <AnnouncementAnalytics announcements={snapshot.announcements} />}

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Tazama Insights</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <InsightCardSkeleton key={i} />)
                : snapshot.insights.map((insight) => (
                    <TazamaInsightCard key={insight.id} insight={insight} onCta={() => handleAssistantAction(insight.ctaLabel ?? "")} />
                  ))}
            </div>
          </div>
        </div>

        {assistantOpen && <div className="hidden h-[calc(100vh-220px)] min-h-125 xl:block">{assistantPanel}</div>}
      </div>

      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className="fixed right-8 bottom-8 z-30 hidden items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:flex"
        >
          <AudioLines className="size-4" />
          Ask Assistant
        </button>
      )}

      <button
        type="button"
        onClick={() => setMobileAssistantOpen(true)}
        className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:hidden"
      >
        <BarChart3 className="size-4" />
        Ask Assistant
      </button>
      <Sheet open={mobileAssistantOpen} onOpenChange={setMobileAssistantOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetTitle className="sr-only">Tazama Assistant</SheetTitle>
          {assistantPanel}
        </SheetContent>
      </Sheet>
    </div>
  );
}
