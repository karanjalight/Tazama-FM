"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Plus } from "lucide-react";

import type { Campaign } from "../mock-data";
import { addCampaign, toggleCampaignStatus, useCampaigns } from "../campaigns-store";
import { TARGET_TREE } from "../types";
import { CampaignCard } from "../campaign-card";
import { CampaignsToolbar, DEFAULT_CAMPAIGN_FILTERS, type CampaignFilters } from "./campaigns-toolbar";
import { CampaignDetailView } from "./campaign-detail-view";
import { CreateCampaignDialog } from "../new/create-campaign-dialog";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { VioletButton } from "@/components/business/branches/new/violet-button";

function matches(c: Campaign, filters: CampaignFilters): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !c.name.toLowerCase().includes(q)) return false;
  if (filters.status !== "All Status" && c.status !== filters.status) return false;
  if (filters.advertiser !== "All Advertisers" && c.advertiser !== filters.advertiser) return false;
  if (filters.location !== "All Locations") {
    const loc = TARGET_TREE.find((l) => l.name === filters.location);
    if (!loc || !c.locationIds.includes(loc.id)) return false;
  }
  return true;
}

export function CampaignsWorkspace() {
  const campaigns = useCampaigns();
  const [filters, setFilters] = React.useState<CampaignFilters>(DEFAULT_CAMPAIGN_FILTERS);
  const [viewingId, setViewingId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [dialogKey, setDialogKey] = React.useState(0);

  const filtered = campaigns.filter((c) => matches(c, filters));
  const viewing = campaigns.find((c) => c.id === viewingId) ?? null;

  function openCreate() {
    setDialogKey((k) => k + 1);
    setCreateOpen(true);
  }
  function handleCreated(campaign: Campaign) {
    addCampaign(campaign);
  }
  function handleToggleStatus(id: string) {
    toggleCampaignStatus(id);
    toast.success("Campaign status updated");
  }

  if (viewing) {
    return <CampaignDetailView campaign={viewing} onBack={() => setViewingId(null)} onToggleStatus={handleToggleStatus} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your advertising campaigns.</p>
        </div>
        <VioletButton type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Create Campaign
        </VioletButton>
      </header>

      <CampaignsToolbar filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />

      {campaigns.length === 0 ? (
        <AnalyticsEmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first advertising campaign to start reaching customers through your Tazama screens."
          ctaLabel="Create Campaign"
          onCta={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} onView={(camp) => setViewingId(camp.id)} />
          ))}
          {filtered.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No campaigns match your filters.</p>}
        </div>
      )}

      <CreateCampaignDialog key={dialogKey} open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </div>
  );
}
