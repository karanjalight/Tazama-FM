import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ExternalLink, MonitorPlay, Tablet, Wifi, WifiOff, Clock3 } from "lucide-react";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { listRooms } from "@/lib/business/locations-queries";
import { listBranchDevicesDetailed, type ManagedDevice } from "@/lib/business/device-queries";
import { ScreensDevicesWorkspace } from "@/components/business/screens-devices/screens-devices-workspace";
import { StatTile, type StatItem } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Screens & Devices — Business Dashboard" };

export default async function ScreensDevicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const branch = await getBranchByIdOrSlug(viewer.businessId, id);
  if (!branch) notFound();
  if (!canActOnBranch(viewer, branch.id)) notFound();

  const [devices, rooms] = await Promise.all([
    listBranchDevicesDetailed(branch.id),
    listRooms(branch.id),
  ]);

  const stats = buildDeviceStats(devices);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/business/branches" className="hover:text-foreground">
            Locations
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/business/branches/${branch.id}`} className="hover:text-foreground">
            {branch.name}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Screens &amp; Devices</span>
        </nav>
        <Link
          href={`/business/branches/${branch.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          View Location
          <ExternalLink className="size-3" />
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Screens &amp; Devices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register and manage all screens and audio devices in this location.
        </p>
      </header>

      {/* StatTile's `icon` is a lucide component reference — not serializable
          across the server→client boundary, so it renders here rather than
          being passed as a prop into the "use client" workspace below. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <ScreensDevicesWorkspace
        branchId={branch.id}
        devices={devices}
        roomOptions={rooms.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}

function buildDeviceStats(devices: ManagedDevice[]): StatItem[] {
  const screens = devices.filter((d) => d.kind === "screen");
  const online = devices.filter((d) => d.status === "online");
  const offline = devices.filter((d) => d.status === "offline");
  const pending = devices.filter((d) => d.status === "pending");
  const total = devices.length;
  const onlinePct = total ? `${((online.length / total) * 100).toFixed(1)}% online` : "No devices yet";

  return [
    { key: "screens", label: "Total Screens", value: String(screens.length), sublabel: `${devices.length - screens.length} audio devices`, icon: MonitorPlay, color: "violet" },
    { key: "devices", label: "Total Devices", value: String(total), sublabel: "All types", icon: Tablet, color: "blue" },
    { key: "online", label: "Online", value: String(online.length), sublabel: onlinePct, icon: Wifi, color: "emerald" },
    { key: "offline", label: "Offline", value: String(offline.length), sublabel: "Was connected", icon: WifiOff, color: "rose" },
    { key: "pending", label: "Pending", value: String(pending.length), sublabel: "Never connected", icon: Clock3, color: "fuchsia" },
  ];
}
