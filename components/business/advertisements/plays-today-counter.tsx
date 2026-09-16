import { cn } from "@/lib/utils";

/** The live "7 / 20 plays today" counter. `cap` is the campaign's daily
 * airing limit per screen, so the bar reads as a share of it. */
export function PlaysTodayCounter({
  count,
  cap,
  compact,
  className,
}: {
  count: number;
  cap: number | null;
  compact?: boolean;
  className?: string;
}) {
  const pct = cap ? Math.min(100, Math.round((count / cap) * 100)) : null;
  return (
    <div className={cn("min-w-24", className)}>
      <p className={cn("font-mono tabular-nums", compact ? "text-xs" : "text-sm")}>
        <span key={count} className="inline-block animate-in font-semibold text-foreground fade-in zoom-in-95 duration-300">
          {count.toLocaleString("en-US")}
        </span>
        <span className="text-muted-foreground">{cap ? ` / ${cap}` : ""} today</span>
      </p>
      {pct !== null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${count} of ${cap} daily plays`}>
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", pct >= 100 ? "bg-amber-500" : "bg-violet-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
