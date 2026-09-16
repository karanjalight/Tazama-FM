import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getAdInventory } from "@/lib/business/ad-inventory-queries";
import { InventoryWorkspace } from "@/components/business/advertisements/inventory/inventory-workspace";

export const metadata: Metadata = { title: "Ad Inventory — Business Dashboard" };

/** This business's own screens as ad space: real screens, real campaign
 * bookings, and per-screen ads on/off + CPM. */
export default async function AdInventoryPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const inventory = await getAdInventory(viewer);
  return <InventoryWorkspace businessId={viewer.businessId} inventory={inventory} />;
}
