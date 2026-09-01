import { AVAILABLE_INVENTORY_SCREENS, BOOKED_INVENTORY_SCREENS, INVENTORY_LOCATIONS, TOTAL_INVENTORY_SCREENS, UTILIZATION_PCT } from "./mock-data";
import { InventoryLocationCard } from "./inventory-location-card";
import { ScreenInventoryTable } from "./screen-inventory-table";
import { InventoryCalendar } from "./inventory-calendar";

export function InventoryWorkspace() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertising Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">See where advertisements can appear across your Tazama network.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-semibold text-foreground">{TOTAL_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Total Screens</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-semibold text-emerald-400">{AVAILABLE_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-semibold text-amber-400">{BOOKED_INVENTORY_SCREENS}</p>
          <p className="text-xs text-muted-foreground">Booked</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-semibold text-foreground">{UTILIZATION_PCT}%</p>
          <p className="text-xs text-muted-foreground">Utilization</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Locations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INVENTORY_LOCATIONS.map((loc) => (
            <InventoryLocationCard key={loc.id} location={loc} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <ScreenInventoryTable />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold text-foreground">Advertising Inventory Availability</h2>
        <InventoryCalendar />
      </div>
    </div>
  );
}
