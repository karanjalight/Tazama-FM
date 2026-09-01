import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="mt-3 h-7 w-24" />
      <Shimmer className="mt-2 h-3 w-28" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-56" }: { height?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Shimmer className="h-4 w-40" />
      <Shimmer className={cn("mt-4 w-full", height)} />
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Shimmer className="h-4 w-48" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Shimmer key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Shimmer className="h-4 w-56" />
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 56 }).map((_, i) => (
          <Shimmer key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="mt-2 h-4 w-full" />
      <Shimmer className="mt-1.5 h-4 w-3/4" />
      <Shimmer className="mt-3 h-8 w-32" />
    </div>
  );
}
