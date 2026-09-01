import * as React from "react";

import type { HeatmapCell } from "../data-engine";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INTENSITY_CLASS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-violet-500/20",
  2: "bg-violet-500/45",
  3: "bg-violet-500/70",
  4: "bg-violet-500",
};
const INTENSITY_LABEL: Record<number, string> = {
  0: "very low",
  1: "low",
  2: "moderate",
  3: "high",
  4: "peak",
};

export function ActivityHeatmap({ cells, summary }: { cells: HeatmapCell[]; summary: string }) {
  const hours = Array.from(new Set(cells.map((c) => c.hour)));
  const grid = new Map(cells.map((c) => [`${c.hour}|${c.day}`, c.intensity]));

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-105">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] gap-1">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="flex items-center text-[10px] text-muted-foreground">{hour}</div>
                {DAYS.map((day) => {
                  const intensity = grid.get(`${hour}|${day}`) ?? 0;
                  return (
                    <div
                      key={day}
                      role="img"
                      aria-label={`${day} ${hour}: ${INTENSITY_LABEL[intensity]} activity`}
                      title={`${day} ${hour}: ${INTENSITY_LABEL[intensity]} activity`}
                      className={cn("aspect-square rounded-sm", INTENSITY_CLASS[intensity])}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("size-3 rounded-sm", INTENSITY_CLASS[i])} />
          ))}
        </div>
        <span>More</span>
      </div>

      <p className="sr-only" role="status">
        {summary}
      </p>
    </div>
  );
}
