import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listContentItems } from "@/lib/business/content-queries";
import { getCampaignTargetOptions } from "@/lib/business/campaign-queries";
import { loadAdContext } from "@/lib/business/ad-context";
import { computeAdAnalytics, computeLiveAdStatus } from "@/lib/business/ad-analytics";
import { computeAdInventory } from "@/lib/business/ad-inventory-queries";
import { campaignDisplayStatus } from "@/lib/business/campaign-types";
import { AdvertisingOverviewWorkspace } from "@/components/business/advertisements/advertising-overview-workspace";

export const metadata: Metadata = { title: "Advertisements — Business Dashboard" };

/** Every number here is real: plays come from kiosks actually airing ads,
 * views/reach/revenue are estimated from those plays (lib/business/ad-estimates.ts). */
export default async function AdvertisementsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const now = new Date();
  const ctx = await loadAdContext(viewer);
  const [creatives, targetOptions, analytics, live] = await Promise.all([
    listContentItems(viewer.businessId, { purpose: "ad_creative" }),
    getCampaignTargetOptions(viewer),
    computeAdAnalytics(ctx, { range: "Last 30 days" }, now),
    computeLiveAdStatus(ctx, now),
  ]);
  const inventory = computeAdInventory(ctx, now);
  const campaigns = ctx?.campaigns ?? [];
  const today = analytics.toDate;
  const approvedIds = new Set(creatives.filter((c) => c.status === "approved").map((c) => c.id));

  return (
    <AdvertisingOverviewWorkspace
      businessId={viewer.businessId}
      canDelete={viewer.role !== "manager"}
      today={today}
      campaigns={campaigns}
      creatives={creatives}
      targetOptions={targetOptions}
      analytics={analytics}
      live={live}
      inventory={inventory}
      readiness={{
        schemaReady: analytics.schemaReady,
        approvedCreatives: approvedIds.size,
        liveCampaigns: campaigns.filter(
          (c) =>
            campaignDisplayStatus(c, today) === "Active" &&
            !!c.frequencyMinutes &&
            !!c.creativeId &&
            approvedIds.has(c.creativeId),
        ).length,
        screens: inventory.totals.total,
        onlineScreens: inventory.totals.online,
      }}
    />
  );
}
