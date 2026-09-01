import * as React from "react";

import { INVENTORY_SCREENS, type ScreenAvailability } from "./mock-data";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATE_CLASS: Record<ScreenAvailability, string> = {
  Available: "bg-muted",
  Booked: "bg-violet-500",
  Restricted: "bg-rose-500/60",
};

/** Deterministic per-screen weekly pattern derived from the screen's own booked/available status — a representative sample, not all ~186 screens. */
function weekFor(screen: (typeof INVENTORY_SCREENS)[number], seed: number): ScreenAvailability[] {
  return DAYS.map((_, i) => {
    if (screen.availability === "Restricted") return "Restricted";
    if (screen.availability === "Booked") return (seed + i) % 3 === 0 ? "Available" : "Booked";
    return (seed + i) % 4 === 0 ? "Booked" : "Available";
  });
}

export function InventoryCalendar() {
  const sample = INVENTORY_SCREENS.slice(0, 8);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-125">
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {sample.map((screen, si) => (
              <React.Fragment key={screen.id}>
                <div className="flex items-center text-xs text-foreground">{screen.name}</div>
                {weekFor(screen, si).map((state, di) => (
                  <div
                    key={`${screen.id}-${di}`}
                    role="img"
                    aria-label={`${screen.name} on ${DAYS[di]}: ${state}`}
                    title={`${screen.name} · ${DAYS[di]}: ${state}`}
                    className={cn("h-6 rounded-sm", STATE_CLASS[state])}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-500" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500/60" /> Restricted
        </span>
      </div>
    </div>
  );
}
