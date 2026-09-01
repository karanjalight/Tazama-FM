import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { CampaignsWorkspace } from "@/components/business/advertisements/campaigns/campaigns-workspace";

export const metadata: Metadata = { title: "Campaigns — Business Dashboard" };

/**
 * Static preview of Campaigns — the detail view is an in-page state switch
 * (not a dynamic route), same reasoning as Reports: a campaign's data only
 * exists in this session's local state, so a real /campaigns/[id] route
 * would 404 on a fresh page load for anything created this session.
 */
export default async function CampaignsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <CampaignsWorkspace />;
}
