import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import {
  getBusinessSettings,
  getBusinessHours,
  getBusinessPhone,
} from "@/lib/business/settings-queries";
import { BusinessSettingsPage } from "@/components/business/settings/business/business-settings-page";

export const metadata: Metadata = { title: "Business Settings" };

export default async function Page() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const [settings, hours, phone] = await Promise.all([
    getBusinessSettings(viewer.businessId),
    getBusinessHours(viewer.businessId),
    getBusinessPhone(viewer.businessId),
  ]);

  return (
    <BusinessSettingsPage
      businessId={viewer.businessId}
      businessName={viewer.businessName}
      phone={phone}
      settings={settings}
      hours={hours}
    />
  );
}
