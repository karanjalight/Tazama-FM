"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { campaignDisplayStatus, type Campaign, type CampaignTargetOptions } from "@/lib/business/campaign-types";
import type { AdAnalytics, LiveAdStatus } from "@/lib/business/ad-analytics";
import type { AdInventory } from "@/lib/business/ad-inventory-queries";
import { AdsKpiCard } from "./ads-kpi-card";
import { AdsPerformanceChart } from "./ads-performance-chart";
import { CampaignPerformanceTable } from "./campaign-performance-table";
import { TopPerformingAds } from "./top-performing-ads";
import { InventorySummary } from "./inventory-summary";
import { OnAirNow } from "./on-air-now";
import { EstimateInfo } from "./estimate-info";
import { ReadinessChecklist, isAdServingReady, type AdReadiness } from "./readiness-checklist";
import { useLiveAdStatus, useRefreshOnNewPlays } from "./use-live-ad-status";
import { formatCompact, formatCount, formatKes, trendOf } from "./format";
import { TazamaInsightCard } from "@/components/business/analytics/tazama-insight-card";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";
import { CreateCampaignDialog } from "./new/create-campaign-dialog";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function AdvertisingOverviewWorkspace({
  businessId,
  canDelete,
  today,
  campaigns,
  creatives,
  targetOptions,
  analytics,
  live: initialLive,
  inventory,
  readiness,
}: {
  businessId: string;
  canDelete: boolean;
  today: string;
  campaigns: Campaign[];
  creatives: ContentItem[];
  targetOptions: CampaignTargetOptions;
  analytics: AdAnalytics;
  live: LiveAdStatus;
  inventory: AdInventory;
  readiness: AdReadiness;
}) {
  const router = useRouter();
  const live = useLiveAdStatus(initialLive);
  const [dialog, setDialog] = React.useState<{ key: number; campaign: Campaign | null } | null>(null);

  useRefreshOnNewPlays(live.totalPlaysToday);

  const { totals, previous } = analytics;
  const activeCount = campaigns.filter((c) => campaignDisplayStatus(c, today) === "Active").length;
  const scheduledCount = campaigns.filter((c) => campaignDisplayStatus(c, today) === "Scheduled").length;
  const visibleCampaigns = campaigns.filter((c) => c.status !== "Archived");

  function openCreate(campaign: Campaign | null = null) {
    setDialog((d) => ({ key: (d?.key ?? 0) + 1, campaign }));
  }
  function viewCampaign(c: Campaign) {
    router.push(`/business/advertisements/campaigns?campaign=${c.id}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertisements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ads take over your chosen screens on schedule. Every play is counted, and views, reach and revenue are estimated from them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstimateInfo className="mr-1" />
          <Link
            href="/business/advertisements/inventory"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View Inventory
          </Link>
          <VioletButton type="button" onClick={() => openCreate()}>
            <Plus className="size-4" />
            Create Campaign
          </VioletButton>
        </div>
      </header>

      {!isAdServingReady(readiness) && <ReadinessChecklist readiness={readiness} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <AdsKpiCard
          label="Active Campaigns"
          value={String(activeCount)}
          sublabel={scheduledCount ? `${scheduledCount} scheduled` : `${campaigns.length} total`}
          delayMs={0}
        />
        <AdsKpiCard label="Ad Plays · 30d" value={formatCount(totals.plays)} trend={trendOf(totals.plays, previous.plays)} sublabel={`${formatCount(live.totalPlaysToday)} today`} delayMs={40} />
        <AdsKpiCard label="Views · 30d" value={formatCompact(totals.views)} trend={trendOf(totals.views, previous.views)} estimated delayMs={80} />
        <AdsKpiCard label="Reach · 30d" value={formatCompact(totals.reach)} trend={trendOf(totals.reach, previous.reach)} estimated delayMs={120} />
        <AdsKpiCard label="Revenue · 30d" value={formatKes(totals.revenue)} trend={trendOf(totals.revenue, previous.revenue)} estimated delayMs={160} />
        <AdsKpiCard
          label="Available Screens"
          value={`${inventory.totals.available}/${inventory.totals.total}`}
          sublabel={`${inventory.totals.utilizationPct}% booked today`}
          delayMs={200}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <OnAirNow status={live} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Tazama Insights</h2>
          {analytics.insights.length ? (
            <div className="mt-3 space-y-3">
              {analytics.insights.slice(0, 2).map((insight) => (
                <TazamaInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Insights appear here after your first ad plays.</p>
          )}
        </div>
      </div>

      <AdsPerformanceChart daily={analytics.daily} title="Last 30 days" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Campaign Performance</h2>
            <Link href="/business/advertisements/campaigns" className="text-sm font-medium text-violet-400 hover:text-violet-300">
              All campaigns
            </Link>
          </div>
          <div className="mt-3">
            <CampaignPerformanceTable
              campaigns={visibleCampaigns}
              stats={analytics.byCampaign}
              playsToday={live.playsToday}
              today={today}
              canDelete={canDelete}
              onView={viewCampaign}
              onEdit={(c) => openCreate(c)}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Top Performing Ads</h2>
          <div className="mt-3">
            <TopPerformingAds campaigns={campaigns} stats={analytics.byCampaign} creatives={creatives} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Screen Inventory</h2>
          <div className="mt-3">
            <InventorySummary inventory={inventory} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Plays by Location · 30d</h2>
            <Link href="/business/advertisements/performance" className="text-sm font-medium text-violet-400 hover:text-violet-300">
              Performance
            </Link>
          </div>
          <div className="mt-4">
            {analytics.byLocation.length ? (
              <HorizontalBars
                items={analytics.byLocation.map((l) => ({ id: l.id, name: l.name, value: l.plays }))}
                formatValue={(v) => `${formatCount(v)} plays`}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No plays recorded in the last 30 days.</p>
            )}
          </div>
        </div>
      </div>

      {dialog && (
        <CreateCampaignDialog
          key={dialog.key}
          businessId={businessId}
          creatives={creatives}
          targetOptions={targetOptions}
          campaign={dialog.campaign}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
