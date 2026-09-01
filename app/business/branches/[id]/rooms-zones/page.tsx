import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { ROOMS_ZONES_STATS } from "@/components/business/rooms-zones/mock-data";
import { RoomsZonesWorkspace } from "@/components/business/rooms-zones/rooms-zones-workspace";
import { StatTile } from "@/components/business/stat-tile";

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

  const [zones, rooms] = await Promise.all([
    listZones(branch.id),
    listRooms(branch.id),
  ]);

  // Screens / Capacity stay mock for now — Screens & Devices isn't wired yet.
  // Rooms and Zones are real, now that this page reads live data instead of
  // the static preview (Audio Zones has since gone real too — see
  // /business/branches/[id]/audio-zones).
  const stats = ROOMS_ZONES_STATS.map((stat) => {
    if (stat.key === "rooms") {
      return {
        ...stat,
        value: String(rooms.length),
        sublabel: `Across ${zones.length} zone${zones.length === 1 ? "" : "s"}`,
      };
    }
    if (stat.key === "zones") {
      return { ...stat, value: String(zones.length), sublabel: undefined };
    }
    return stat;
  });

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

      <RoomsZonesWorkspace branchId={branch.id} initialZones={zones} initialRooms={rooms} />
    </div>
  );
}
