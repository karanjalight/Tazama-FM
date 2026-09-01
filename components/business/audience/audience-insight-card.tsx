import type { InsightCard } from "@/components/business/analytics/data-engine";

export function AudienceInsightCard({ insight }: { insight: InsightCard }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{insight.title}</p>
      <p className="mt-2 text-sm text-foreground">{insight.body}</p>
    </div>
  );
}
