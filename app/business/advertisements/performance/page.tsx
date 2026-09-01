import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { AdPerformanceWorkspace } from "@/components/business/advertisements/performance/ad-performance-workspace";

export const metadata: Metadata = { title: "Ad Performance — Business Dashboard" };

export default async function AdPerformancePage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <AdPerformanceWorkspace />;
}
