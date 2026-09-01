import { ActivityHeatmap } from "@/components/business/analytics/charts/activity-heatmap";
import type { HeatmapCell } from "@/components/business/analytics/data-engine";

export function AudienceHeatmapSection({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Audience Activity</h2>
      <p className="mb-4 text-sm text-muted-foreground">When your locations are most active.</p>
      <ActivityHeatmap cells={cells} summary="Audience activity peaks around lunch, from 12 to 2 PM, every day of the week." />
    </div>
  );
}
