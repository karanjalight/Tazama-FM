"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import type { Campaign } from "./mock-data";
import { addCampaign, useCampaigns } from "./campaigns-store";
import { TOTAL_INVENTORY_SCREENS } from "./inventory/mock-data";
import { AdsKpiCard } from "./ads-kpi-card";
import { AdsPerformanceChart } from "./ads-performance-chart";
import { CampaignPerformanceTable } from "./campaign-performance-table";
import { TopPerformingAds } from "./top-performing-ads";
import { InventorySummary } from "./inventory-summary";
import { TazamaInsightCard } from "@/components/business/analytics/tazama-insight-card";
import { CreateCampaignDialog } from "./new/create-campaign-dialog";
import { VioletButton } from "@/components/business/branches/new/violet-button";

const INSIGHTS = [
  {
    id: "ads-insight-peak",
    title: "Tazama Insight",
    body: "Your advertising inventory is most valuable between 5 PM and 8 PM. Demand during this period is approximately 28% higher.",
    ctaLabel: "View Inventory",
  },
  {
    id: "ads-insight-campaign",
    title: "Campaign Insight",
    body: "Happy Hour Promo has the highest completion rate among active campaigns. 94% completion.",
    ctaLabel: "View Campaign",
  },
];

export function AdvertisingOverviewWorkspace() {
  const campaigns = useCampaigns();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [dialogKey, setDialogKey] = React.useState(0);

  function openCreate() {
    setDialogKey((k) => k + 1);
    setCreateOpen(true);
  }
  function handleCreated(campaign: Campaign) {
    addCampaign(campaign);
  }
  function handleView(campaign: Campaign) {
    toast.info(campaign.name, { description: "Open the Campaigns page for the full detail view." });
  }
  function handleInsightAction(label?: string) {
    toast.info(label ?? "Action", { description: "This action isn't wired up in this preview yet." });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertisements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, manage and measure advertising across your Tazama screen network.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/business/advertisements/inventory" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            View Inventory
          </Link>
          <VioletButton type="button" onClick={openCreate}>
            <Plus className="size-4" />
            Create Campaign
          </VioletButton>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AdsKpiCard label="Active Campaigns" value="12" trendText="+3 this month" delayMs={0} />
        <AdsKpiCard label="Ad Plays" value="24,820" trendText="+18.4%" delayMs={40} />
        <AdsKpiCard label="Estimated Reach" value="48,240" trendText="+21.8%" delayMs={80} />
        <AdsKpiCard label="Screen Inventory" value={String(TOTAL_INVENTORY_SCREENS)} sublabel="Available slots" delayMs={120} />
        <AdsKpiCard label="Estimated Revenue" value="KES 184,500" sublabel="This month · Estimated" delayMs={160} />
      </div>

      <AdsPerformanceChart />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Campaign Performance</h2>
          <div className="mt-3">
            <CampaignPerformanceTable campaigns={campaigns} onView={handleView} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Top Performing Ads</h2>
          <div className="mt-3">
            <TopPerformingAds campaigns={campaigns} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Screen Inventory</h2>
          <div className="mt-3">
            <InventorySummary />
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold text-foreground">Tazama Insights</h2>
          <div className="space-y-3">
            {INSIGHTS.map((insight) => (
              <TazamaInsightCard key={insight.id} insight={insight} onCta={() => handleInsightAction(insight.ctaLabel)} />
            ))}
          </div>
        </div>
      </div>

      <CreateCampaignDialog key={dialogKey} open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </div>
  );
}
