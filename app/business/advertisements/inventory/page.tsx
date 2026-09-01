import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { InventoryWorkspace } from "@/components/business/advertisements/inventory/inventory-workspace";

export const metadata: Metadata = { title: "Ad Inventory — Business Dashboard" };

/**
 * Static preview of Advertising Inventory — a deliberately larger,
 * network-wide 186-screen world (components/business/advertisements/inventory/mock-data.ts),
 * distinct from the ~24-screen "my business" world used for campaign
 * targeting, per the brief's own product framing (Tazama can eventually
 * operate a media network across many eligible businesses' screens).
 */
export default async function AdInventoryPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <InventoryWorkspace />;
}
