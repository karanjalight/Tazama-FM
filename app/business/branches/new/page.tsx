import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { CreateLocationWizard } from "@/components/business/branches/new/create-location-wizard";

export const metadata: Metadata = { title: "Add Location — Business Dashboard" };

/**
 * Steps 1-4 build a local draft (localStorage-backed, see use-wizard-draft.ts);
 * "Create Location" on step 5 cascades the whole thing into real Supabase
 * writes via `createLocationFromDraft` (branch, zones, rooms, screens with
 * real pairing codes, audio zones).
 */
export default async function NewLocationPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <CreateLocationWizard businessName={viewer.businessName} />;
}
