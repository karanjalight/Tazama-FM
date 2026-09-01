import { PeakHoursChart } from "@/components/business/analytics/charts/peak-hours-chart";
import type { PeakHourBar } from "@/components/business/analytics/data-engine";

export function PeakHoursSection({ bars, peakPeriodLabel }: { bars: PeakHourBar[]; peakPeriodLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Peak Activity</h2>
      <div className="mt-4">
        <PeakHoursChart bars={bars} peakPeriodLabel={peakPeriodLabel} />
      </div>
    </div>
  );
}
