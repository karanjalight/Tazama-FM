"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import {
  campaignDisplayStatus,
  coveredScreens,
  type Campaign,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";
import type { AdAnalytics, LiveAdStatus } from "@/lib/business/ad-analytics";
import { CampaignCard } from "../campaign-card";
import { CampaignsToolbar, DEFAULT_CAMPAIGN_FILTERS, type CampaignFilters } from "./campaigns-toolbar";
import { CampaignDetailView } from "./campaign-detail-view";
import { CreateCampaignDialog } from "../new/create-campaign-dialog";
import { EstimateInfo } from "../estimate-info";
import { useLiveAdStatus, useRefreshOnNewPlays } from "../use-live-ad-status";
import { formatCount, formatKes } from "../format";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { VioletButton } from "@/components/business/branches/new/violet-button";

function matches(c: Campaign, today: string, options: CampaignTargetOptions, filters: CampaignFilters): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !c.name.toLowerCase().includes(q) && !(c.advertiserName ?? "").toLowerCase().includes(q)) return false;
  const status = campaignDisplayStatus(c, today);
  if (filters.status === "All Status" ? status === "Archived" : status !== filters.status) return false;
  if (filters.advertiser !== "All Advertisers" && c.advertiserName !== filters.advertiser) return false;
  if (filters.location !== "All Locations") {
    const loc = options.locations.find((l) => l.name === filters.location);
    if (!loc) return false;
    const reaches = c.target.locationIds.includes(loc.id) || coveredScreens(c.target, options).some((s) => s.branchId === loc.id);
    if (!reaches) return false;
  }
  return true;
}

export function CampaignsWorkspace({
  businessId,
  canDelete,
  today,
  campaigns,
  creatives,
  targetOptions,
  analytics,
  live: initialLive,
  viewingId,
  detail,
}: {
  businessId: string;
  canDelete: boolean;
  today: string;
  campaigns: Campaign[];
  creatives: ContentItem[];
  targetOptions: CampaignTargetOptions;
  analytics: AdAnalytics;
  live: LiveAdStatus;
  viewingId: string | null;
  detail: AdAnalytics | null;
}) {
  const router = useRouter();
  const live = useLiveAdStatus(initialLive);
  const [filters, setFilters] = React.useState<CampaignFilters>(DEFAULT_CAMPAIGN_FILTERS);
  const [dialog, setDialog] = React.useState<{ key: number; campaign: Campaign | null } | null>(null);

  useRefreshOnNewPlays(live.totalPlaysToday);

  const onAirIds = new Set(live.onAir.map((a) => a.campaignId).filter(Boolean) as string[]);
  const filtered = campaigns.filter((c) => matches(c, today, targetOptions, filters));
  const viewing = viewingId ? (campaigns.find((c) => c.id === viewingId) ?? null) : null;
  const advertisers = [...new Set(campaigns.map((c) => c.advertiserName).filter((a): a is string => !!a))].sort();

  function openDialog(campaign: Campaign | null = null) {
    setDialog((d) => ({ key: (d?.key ?? 0) + 1, campaign }));
  }
  const view = (c: Campaign | null) =>
    router.push(c ? `/business/advertisements/campaigns?campaign=${c.id}` : "/business/advertisements/campaigns", { scroll: true });

  const dialogEl = dialog && (
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
  );

  if (viewing) {
    return (
      <>
        <CampaignDetailView
          campaign={viewing}
          today={today}
          canDelete={canDelete}
          creative={viewing.creativeId ? (creatives.find((c) => c.id === viewing.creativeId) ?? null) : null}
          creatives={creatives}
          targetOptions={targetOptions}
          analytics={detail}
          playsToday={live.playsToday[viewing.id] ?? detail?.byCampaign[viewing.id]?.playsToday ?? 0}
          onAir={live.onAir.filter((a) => a.campaignId === viewing.id)}
          onBack={() => view(null)}
          onEdit={() => openDialog(viewing)}
        />
        {dialogEl}
      </>
    );
  }

  const { totals } = analytics;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} · last 30 days: {formatCount(totals.plays)} plays ·{" "}
            {formatCount(totals.reach)} est. reach · {formatKes(totals.revenue)} est. revenue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EstimateInfo />
          <VioletButton type="button" onClick={() => openDialog()}>
            <Plus className="size-4" />
            Create Campaign
          </VioletButton>
        </div>
      </header>

      <CampaignsToolbar filters={filters} targetOptions={targetOptions} advertisers={advertisers} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />

      {campaigns.length === 0 ? (
        <AnalyticsEmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first advertising campaign to start reaching customers through your Tazama screens."
          ctaLabel="Create Campaign"
          onCta={() => openDialog()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              today={today}
              canDelete={canDelete}
              targetOptions={targetOptions}
              stats={analytics.byCampaign[c.id]}
              playsToday={live.playsToday[c.id] ?? analytics.byCampaign[c.id]?.playsToday ?? 0}
              onAir={onAirIds.has(c.id)}
              onView={() => view(c)}
              onEdit={() => openDialog(c)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No campaigns match your filters.</p>
          )}
        </div>
      )}

      {dialogEl}
    </div>
  );
}
