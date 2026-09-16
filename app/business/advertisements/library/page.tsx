import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listContentItems } from "@/lib/business/content-queries";
import { AdLibraryWorkspace } from "@/components/business/advertisements/library/ad-library-workspace";

export const metadata: Metadata = { title: "Ad Library — Business Dashboard" };

export default async function AdLibraryPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const items = await listContentItems(viewer.businessId, { purpose: "ad_creative" });
  const canModerate = viewer.role === "owner" || viewer.role === "admin";

  return <AdLibraryWorkspace businessId={viewer.businessId} items={items} canModerate={canModerate} />;
}
