import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AVAILABLE_INVENTORY_SCREENS, BOOKED_INVENTORY_SCREENS, INVENTORY_LOCATIONS, TOTAL_INVENTORY_SCREENS } from "./inventory/mock-data";

export function InventorySummary() {
  const availablePct = Math.round((AVAILABLE_INVENTORY_SCREENS / TOTAL_INVENTORY_SCREENS) * 100);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="font-mono text-xl font-bold text-foreground">{TOTAL_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Total Screens</p>
        </div>
        <div>
          <p className="font-mono text-xl font-bold text-emerald-400">{AVAILABLE_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div>
          <p className="font-mono text-xl font-bold text-amber-400">{BOOKED_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Booked</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-amber-500/30" role="img" aria-label={`${availablePct}% of inventory available, the rest booked`}>
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${availablePct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>Available ({availablePct}%)</span>
        <span>Booked ({100 - availablePct}%)</span>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Available Inventory</p>
        {INVENTORY_LOCATIONS.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{loc.name}</span>
            <span className="font-mono text-muted-foreground">{loc.available} screens</span>
          </div>
        ))}
      </div>

      <Link href="/business/advertisements/inventory" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
        View Inventory
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
