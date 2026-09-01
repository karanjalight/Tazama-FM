import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getBillingSummary } from "@/lib/business/settings-queries";
import { BillingSettingsPage } from "@/components/business/settings/billing/billing-settings-page";

export const metadata: Metadata = { title: "Billing & Plans" };

export default async function Page() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const billing = await getBillingSummary(viewer.businessId);

  return <BillingSettingsPage billing={billing} />;
}
