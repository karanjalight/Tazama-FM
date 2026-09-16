"use client";

import { MonitorOff } from "lucide-react";

import type { AdInventory } from "@/lib/business/ad-inventory-queries";
import { AdsKpiCard } from "../ads-kpi-card";
import { InventoryLocationCard } from "./inventory-location-card";
import { ScreenInventoryTable } from "./screen-inventory-table";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { formatKes } from "../format";

export function InventoryWorkspace({ businessId, inventory }: { businessId: string; inventory: AdInventory }) {
  const { totals } = inventory;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertising Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every screen you own is ad space. See what&apos;s booked, switch ads off where they don&apos;t belong, and set each
          screen&apos;s rate. Screens without their own CPM use {formatKes(inventory.defaultCpm)}.
        </p>
      </header>

      {!inventory.schemaReady && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          Screen ad settings can&apos;t be saved yet. Run <code className="font-mono text-foreground">supabase/business-ad-serving.sql</code> in
          the Supabase SQL editor to enable them.
        </p>
      )}

      {totals.total === 0 ? (
        <AnalyticsEmptyState
          icon={MonitorOff}
          title="No screens yet"
          description="Pair a screen to one of your locations under Screens & Devices. Each one becomes ad inventory automatically."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <AdsKpiCard label="Total Screens" value={String(totals.total)} sublabel={`${totals.online} online now`} />
            <AdsKpiCard label="Available" value={String(totals.available)} sublabel="Nothing booked today" />
            <AdsKpiCard label="Booked Today" value={String(totals.booked)} sublabel={`${totals.liveNow} in an active window now`} />
            <AdsKpiCard label="Ads Off" value={String(totals.restricted)} sublabel="Screen or location opted out" />
            <AdsKpiCard label="Utilization" value={`${totals.utilizationPct}%`} sublabel="Booked ÷ sellable screens" />
            <AdsKpiCard
              label="Avg. CPM"
              value={formatKes(inventory.screens.reduce((s, x) => s + x.effectiveCpm, 0) / Math.max(1, inventory.screens.length))}
              sublabel="Per 1,000 est. views"
            />
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Locations</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inventory.locations.map((loc) => (
                <InventoryLocationCard key={loc.id} location={loc} />
              ))}
            </div>
          </div>

          <ScreenInventoryTable businessId={businessId} inventory={inventory} />
        </>
      )}
    </div>
  );
}
