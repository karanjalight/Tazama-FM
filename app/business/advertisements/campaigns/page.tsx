import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listContentItems } from "@/lib/business/content-queries";
import { getCampaignTargetOptions } from "@/lib/business/campaign-queries";
import { loadAdContext } from "@/lib/business/ad-context";
import { computeAdAnalytics, computeLiveAdStatus } from "@/lib/business/ad-analytics";
import { CampaignsWorkspace } from "@/components/business/advertisements/campaigns/campaigns-workspace";

export const metadata: Metadata = { title: "Campaigns — Business Dashboard" };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const { campaign: viewingId } = await searchParams;
  const now = new Date();
  const ctx = await loadAdContext(viewer);
  const viewing = viewingId ? ctx?.campaigns.find((c) => c.id === viewingId) : undefined;

  const [creatives, targetOptions, analytics, live, detail] = await Promise.all([
    listContentItems(viewer.businessId, { purpose: "ad_creative" }),
    getCampaignTargetOptions(viewer),
    computeAdAnalytics(ctx, { range: "Last 30 days" }, now),
    computeLiveAdStatus(ctx, now),
    viewing ? computeAdAnalytics(ctx, { range: "Last 30 days", campaignId: viewing.id }, now) : Promise.resolve(null),
  ]);

  return (
    <CampaignsWorkspace
      businessId={viewer.businessId}
      canDelete={viewer.role !== "manager"}
      today={analytics.toDate}
      campaigns={ctx?.campaigns ?? []}
      creatives={creatives}
      targetOptions={targetOptions}
      analytics={analytics}
      live={live}
      viewingId={viewing?.id ?? null}
      detail={detail}
    />
  );
}
