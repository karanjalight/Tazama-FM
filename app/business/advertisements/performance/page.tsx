import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { loadAdContext } from "@/lib/business/ad-context";
import { AD_RANGES, computeAdAnalytics, type AdRange } from "@/lib/business/ad-analytics";
import { AdPerformanceWorkspace } from "@/components/business/advertisements/performance/ad-performance-workspace";

export const metadata: Metadata = { title: "Ad Performance — Business Dashboard" };

type Params = { range?: string; location?: string; campaign?: string; advertiser?: string };

export default async function AdPerformancePage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const params = await searchParams;
  const range: AdRange = (AD_RANGES as readonly string[]).includes(params.range ?? "") ? (params.range as AdRange) : "Last 30 days";
  const ctx = await loadAdContext(viewer);
  const locationId = ctx?.branchById.has(params.location ?? "") ? params.location! : null;
  const campaignId = ctx?.campaignById.has(params.campaign ?? "") ? params.campaign! : null;
  const advertiser = params.advertiser?.trim() || null;

  const analytics = await computeAdAnalytics(ctx, { range, locationId, campaignId, advertiser });

  return (
    <AdPerformanceWorkspace
      analytics={analytics}
      filters={{ range, locationId, campaignId, advertiser }}
      locations={(ctx?.branches ?? []).map((b) => ({ id: b.id, name: b.name }))}
      campaigns={(ctx?.campaigns ?? []).map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
