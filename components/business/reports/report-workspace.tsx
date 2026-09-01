"use client";

import * as React from "react";
import { toast } from "sonner";
import { AudioLines, ChevronDown, Download } from "lucide-react";

import { DEFAULT_FILTERS, type AnalyticsFilters } from "@/components/business/analytics/types";
import { generateAnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { AnalyticsFiltersBar } from "@/components/business/analytics/analytics-filters-bar";
import { TazamaAnalyticsAssistant } from "@/components/business/analytics/assistant/tazama-analytics-assistant";
import { TableSkeleton } from "@/components/business/analytics/skeletons";
import { REPORT_TYPES, type ReportType } from "./mock-data";
import { PerformanceReportView } from "./views/performance-report-view";
import { AdvertisingReportView } from "./views/advertising-report-view";
import { AudienceReportView } from "./views/audience-report-view";
import { LocationReportView } from "./views/location-report-view";
import { ScreenHealthReportView } from "./views/screen-health-report-view";
import { AnnouncementsReportView } from "./views/announcements-report-view";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ReportWorkspace() {
  const [activeTab, setActiveTab] = React.useState<ReportType>("Performance");
  const [filters, setFilters] = React.useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
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
    toast.info(`${format} export isn't wired up yet`, { description: `${activeTab} report — export will be available later.` });
  }

  function handleAssistantAction(label: string) {
    toast.info(label, { description: "This action isn't wired up in this preview yet." });
  }

  const assistantPanel = (
    <TazamaAnalyticsAssistant snapshot={snapshot} onAction={handleAssistantAction} onMinimize={() => setAssistantOpen(false)} />
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filter your Tazama performance data and download it as a report.</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Download className="size-4" />
            Download
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

      <AnalyticsFiltersBar filters={filters} onChange={updateFilters} showCompare={false} />

      <div role="tablist" aria-label="Report type" className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isActive = activeTab === rt.id;
          return (
            <button
              key={rt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(rt.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {rt.id}
            </button>
          );
        })}
      </div>

      <div className={cn("grid items-start gap-6", assistantOpen && "xl:grid-cols-[1fr_320px]")}>
        <div>
          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <>
              {activeTab === "Performance" && <PerformanceReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
              {activeTab === "Advertising" && <AdvertisingReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
              {activeTab === "Audience" && <AudienceReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
              {activeTab === "Location" && <LocationReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
              {activeTab === "Screen Health" && <ScreenHealthReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
              {activeTab === "Announcements" && <AnnouncementsReportView snapshot={snapshot} dateRangeLabel={filters.dateRange} />}
            </>
          )}
        </div>

        {assistantOpen && <div className="hidden h-125 xl:block">{assistantPanel}</div>}
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
        <AudioLines className="size-4" />
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
