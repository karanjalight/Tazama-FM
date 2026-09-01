import type { PeakHourBar } from "../data-engine";
import { cn } from "@/lib/utils";

export function PeakHoursChart({ bars, peakPeriodLabel }: { bars: PeakHourBar[]; peakPeriodLabel: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peakValue = Math.max(...bars.map((b) => b.value));

  return (
    <div>
      <div className="flex items-end gap-2" role="img" aria-label={`Peak activity by hour. Peak period ${peakPeriodLabel}.`}>
        {bars.map((bar) => {
          const isPeak = bar.value === peakValue;
          const heightPct = Math.max(6, Math.round((bar.value / max) * 100));
          return (
            <div key={bar.hour} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-32 w-full items-end">
                <div
                  className={cn("w-full rounded-t-md transition-all", isPeak ? "bg-violet-500" : "bg-violet-500/35")}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className={cn("text-[10px]", isPeak ? "font-semibold text-violet-400" : "text-muted-foreground")}>{bar.hour}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-violet-500/10 px-3.5 py-2.5 text-center">
        <p className="text-xs text-muted-foreground">Peak period</p>
        <p className="text-sm font-semibold text-violet-300">{peakPeriodLabel}</p>
      </div>
    </div>
  );
}
