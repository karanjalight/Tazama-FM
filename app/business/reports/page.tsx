import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { ReportWorkspace } from "@/components/business/reports/report-workspace";

export const metadata: Metadata = { title: "Reports — Business Dashboard" };

/**
 * Static preview of Reports — a tabbed, live-filtered view over the same
 * seeded Analytics data engine (components/business/analytics/data-engine.ts),
 * not a generate-then-view wizard. Defaults to the Performance tab; switching
 * tabs or filters re-derives the snapshot instantly. Download is decorative —
 * no real PDF/CSV is produced yet.
 */
export default async function ReportsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <ReportWorkspace />;
}
