import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { AnalyticsWorkspace } from "@/components/business/analytics/analytics-workspace";

export const metadata: Metadata = { title: "Analytics — Business Dashboard" };

/**
 * Static preview of the Analytics section — every number here comes from
 * components/business/analytics/data-engine.ts's seeded generator, not live
 * Supabase data. Changing a filter deterministically re-derives a new (but
 * proportionate) snapshot rather than reading anything real.
 */
export default async function AnalyticsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <AnalyticsWorkspace />;
}
