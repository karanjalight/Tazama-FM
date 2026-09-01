import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { AdvertisingOverviewWorkspace } from "@/components/business/advertisements/advertising-overview-workspace";

export const metadata: Metadata = { title: "Advertisements — Business Dashboard" };

/**
 * Static preview of the Advertisements Overview — every number here is
 * local mock state (components/business/advertisements/mock-data.ts);
 * nothing touches ad-serving, billing, M-Pesa or real impression tracking.
 */
export default async function AdvertisementsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <AdvertisingOverviewWorkspace />;
}
