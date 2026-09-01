import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { AdLibraryWorkspace } from "@/components/business/advertisements/library/ad-library-workspace";

export const metadata: Metadata = { title: "Ad Library — Business Dashboard" };

export default async function AdLibraryPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <AdLibraryWorkspace />;
}
