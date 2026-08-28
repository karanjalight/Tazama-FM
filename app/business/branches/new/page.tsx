import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { CreateLocationWizard } from "@/components/business/branches/new/create-location-wizard";

export const metadata: Metadata = { title: "Add Location — Business Dashboard" };

/**
 * Static preview of the "Add Location" wizard — every step below the auth
 * guard runs on client state seeded from wizard-data.ts, not live Supabase
 * data. The real "Add branch" pairing-code flow (create-branch-dialog.tsx,
 * pairing-code.tsx) is untouched on disk, just not linked from here yet.
 */
export default async function NewLocationPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <CreateLocationWizard />;
}
