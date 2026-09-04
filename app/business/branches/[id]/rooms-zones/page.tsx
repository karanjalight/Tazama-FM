import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, DoorOpen, ExternalLink, LayoutGrid, MonitorPlay, Users, Volume2 } from "lucide-react";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { listZones, listRooms, type Zone, type Room } from "@/lib/business/locations-queries";
import { listBranchDevicesDetailed, type ManagedDevice } from "@/lib/business/device-queries";
import { listAudioZonesForBranch } from "@/lib/business/audio-zone-queries";
import type { AudioZone } from "@/lib/business/audio-zone-types";
import { RoomsZonesWorkspace } from "@/components/business/rooms-zones/rooms-zones-workspace";
import { StatTile, type StatItem } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Rooms & Zones — Business Dashboard" };

export default async function RoomsZonesPage({
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

  const [zones, rooms, devices, audioZones] = await Promise.all([
    listZones(branch.id),
    listRooms(branch.id),
    listBranchDevicesDetailed(branch.id),
    listAudioZonesForBranch(branch.id),
  ]);

  const stats = buildRoomsZonesStats(zones, rooms, devices, audioZones);

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
          <span className="text-foreground">Rooms &amp; Zones</span>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rooms &amp; Zones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your location into rooms and zones to manage screens and audio zones.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <RoomsZonesWorkspace
        branchId={branch.id}
        initialZones={zones}
        initialRooms={rooms}
        devices={devices}
        audioZones={audioZones}
      />
    </div>
  );
}

function buildRoomsZonesStats(
  zones: Zone[],
  rooms: Room[],
  devices: ManagedDevice[],
  audioZones: AudioZone[],
): StatItem[] {
  const screens = devices.filter((d) => d.kind === "screen");
  const screensOnline = screens.filter((d) => d.status === "online").length;
  const activeAudioZones = audioZones.filter((z) => z.status === "active").length;
  const capacity = rooms.reduce((sum, r) => sum + (r.capacity ?? 0), 0);

  return [
    {
      key: "rooms",
      label: "Total Rooms",
      value: String(rooms.length),
      sublabel: `Across ${zones.length} zone${zones.length === 1 ? "" : "s"}`,
      icon: DoorOpen,
      color: "violet",
    },
    {
      key: "zones",
      label: "Total Zones",
      value: String(zones.length),
      icon: LayoutGrid,
      color: "blue",
    },
    {
      key: "screens",
      label: "Total Screens",
      value: String(screens.length),
      sublabel: screens.length ? `${screensOnline} online` : "No screens paired",
      icon: MonitorPlay,
      color: "emerald",
    },
    {
      key: "audio-zones",
      label: "Total Audio Zones",
      value: String(audioZones.length),
      sublabel: audioZones.length ? `${activeAudioZones} active` : undefined,
      icon: Volume2,
      color: "amber",
    },
    {
      key: "capacity",
      label: "Capacity (All Rooms)",
      value: String(capacity),
      sublabel: "From rooms",
      icon: Users,
      color: "fuchsia",
    },
  ];
}
