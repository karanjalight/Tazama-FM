import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import type { NamedBar } from "@/components/business/analytics/data-engine";

export function ContentAudienceCorrelation({ items }: { items: NamedBar[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Content Performance vs Audience Activity</h2>
      <div className="mt-4">
        <HorizontalBars items={items} />
      </div>
      <p className="mt-4 rounded-xl bg-violet-500/10 p-3 text-xs text-violet-200">
        Highest audience activity correlates with promotional content between 4 PM and 7 PM.
      </p>
    </div>
  );
}
