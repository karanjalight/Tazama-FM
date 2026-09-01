import type { AnalyticsSnapshot } from "@/components/business/analytics/data-engine";
import { ActivityHeatmap } from "@/components/business/analytics/charts/activity-heatmap";
import { PeakHoursChart } from "@/components/business/analytics/charts/peak-hours-chart";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { ReportDocumentShell, ReportSection, ReportStatCard, ReportStatGrid, ReportTwoColumn } from "./report-document-shell";

const ATTENTION_META = {
  High: "text-emerald-400",
  Medium: "text-amber-400",
  Low: "text-muted-foreground",
} as const;

export function AudienceReportView({ snapshot, dateRangeLabel }: { snapshot: AnalyticsSnapshot; dateRangeLabel: string }) {
  return (
    <ReportDocumentShell title="Audience Report" dateRangeLabel={dateRangeLabel}>
      <ReportSection title="Executive Summary" first>
        <ReportStatGrid>
          <ReportStatCard label="Estimated Audience" value={snapshot.audienceKpis.estimatedAudience.toLocaleString()} />
          <ReportStatCard label="Peak Activity" value={snapshot.audienceKpis.peakActivityLabel} />
          <ReportStatCard label="Avg. Session Activity" value={`${snapshot.audienceKpis.avgSessionMinutes} min`} />
          <ReportStatCard label="Most Active Location" value={snapshot.audienceKpis.mostActiveLocation} />
        </ReportStatGrid>
      </ReportSection>

      <ReportTwoColumn
        left={
          <ReportSection title="Audience Activity" first>
            <ActivityHeatmap cells={snapshot.heatmap} summary="Audience activity peaks around lunch, from 12 to 2 PM, every day of the week." />
          </ReportSection>
        }
        right={
          <ReportSection title="Peak Activity" first>
            <PeakHoursChart bars={snapshot.peakHours} peakPeriodLabel={snapshot.peakPeriodLabel} />
          </ReportSection>
        }
      />

      <ReportTwoColumn
        left={
          <ReportSection title="Audience Activity by Location" first>
            <HorizontalBars items={snapshot.locationAudience} />
          </ReportSection>
        }
        right={
          <ReportSection title="Screen Attention" first>
            <div className="space-y-2">
              {snapshot.screenAttention.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-sm">
                  <span className="text-foreground">{row.name}</span>
                  <span className={`text-xs font-semibold ${ATTENTION_META[row.level]}`}>{row.level}</span>
                </div>
              ))}
            </div>
          </ReportSection>
        }
      />

      <ReportSection title="Content Performance vs Audience Activity">
        <HorizontalBars items={snapshot.contentAudience} />
      </ReportSection>

      <ReportSection title="Key Insights">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>Peak period: {snapshot.peakPeriodLabel} — approximately {snapshot.peakLiftPct}% higher than the daily average.</li>
          <li>{snapshot.audienceKpis.mostActiveLocation} has the highest estimated audience activity this period.</li>
          <li>Highest audience activity correlates with promotional content between 4 PM and 7 PM.</li>
        </ul>
      </ReportSection>
    </ReportDocumentShell>
  );
}
