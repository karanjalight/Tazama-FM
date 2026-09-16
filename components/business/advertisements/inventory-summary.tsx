import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AdInventory } from "@/lib/business/ad-inventory-queries";

export function InventorySummary({ inventory }: { inventory: AdInventory }) {
  const { totals } = inventory;
  const pct = (n: number) => (totals.total ? Math.round((n / totals.total) * 100) : 0);

  if (!totals.total) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No screens paired yet. Pair a screen under Screens &amp; Devices to create ad inventory.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="font-mono text-xl font-bold text-foreground">{totals.total}</p>
          <p className="text-xs text-muted-foreground">Total Screens</p>
        </div>
        <div>
          <p className="font-mono text-xl font-bold text-emerald-400">{totals.available}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div>
          <p className="font-mono text-xl font-bold text-amber-400">{totals.booked}</p>
          <p className="text-xs text-muted-foreground">Booked today</p>
        </div>
      </div>

      <div
        className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${pct(totals.available)}% available, ${pct(totals.booked)}% booked, ${pct(totals.restricted)}% restricted`}
      >
        <div className="h-full bg-emerald-500" style={{ width: `${pct(totals.available)}%` }} />
        <div className="h-full bg-amber-500" style={{ width: `${pct(totals.booked)}%` }} />
        <div className="h-full bg-rose-500/50" style={{ width: `${pct(totals.restricted)}%` }} />
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Available {pct(totals.available)}%</span>
        <span>Booked {pct(totals.booked)}%</span>
        {totals.restricted > 0 && <span>Ads off {pct(totals.restricted)}%</span>}
        <span>{totals.online} online</span>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Available by location</p>
        {inventory.locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{loc.name}</span>
            <span className="shrink-0 font-mono text-muted-foreground">
              {loc.available} / {loc.total} screens
            </span>
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
