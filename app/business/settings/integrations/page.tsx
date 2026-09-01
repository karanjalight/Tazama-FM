import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listIntegrations } from "@/lib/business/settings-queries";
import { IntegrationsSettingsPage } from "@/components/business/settings/integrations/integrations-settings-page";

export const metadata: Metadata = { title: "Integrations" };

export default async function Page() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const integrations = await listIntegrations(viewer.businessId);

  return (
    <IntegrationsSettingsPage businessId={viewer.businessId} integrations={integrations} />
  );
}
