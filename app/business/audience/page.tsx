import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { AudienceWorkspace } from "@/components/business/audience/audience-workspace";

export const metadata: Metadata = { title: "Audience Insights — Business Dashboard" };

/**
 * Static preview of Audience Insights — aggregate-only by design (no
 * individual customer identities anywhere in this UI). Numbers come from
 * the same seeded generator as Analytics (components/business/analytics/data-engine.ts)
 * so the two sections never contradict each other.
 */
export default async function AudiencePage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <AudienceWorkspace />;
}
