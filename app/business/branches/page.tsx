import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, DoorOpen, MonitorPlay, Signal, WifiOff } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listLocationSummaries } from "@/lib/business/locations-queries";
import { StatTile, type StatItem } from "@/components/business/stat-tile";
import { LocationsWorkspace } from "@/components/business/branches/locations-workspace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Locations — Business Dashboard" };

export default async function BranchesPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const locations = await listLocationSummaries(viewer.businessId);
  const stats = buildLocationStats(locations);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all your business locations from one place.
          </p>
        </div>
        <Link
          href="/business/branches/new"
          className={cn(buttonVariants({ variant: "brand" }), "gap-1.5")}
        >
          <Building2 className="size-4" />
          Add Location
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <LocationsWorkspace locations={locations} />
    </div>
  );
}

function buildLocationStats(locations: Awaited<ReturnType<typeof listLocationSummaries>>): StatItem[] {
  const totalScreens = locations.reduce((sum, l) => sum + l.screens, 0);
  const onlineScreens = locations.reduce((sum, l) => sum + l.screensOnline, 0);
  const offlineScreens = totalScreens - onlineScreens;
  const totalRooms = locations.reduce((sum, l) => sum + l.rooms, 0);
  const pct = (n: number) => (totalScreens ? `${((n / totalScreens) * 100).toFixed(1)}%` : "0%");

  return [
    { key: "locations", label: "Total Locations", value: String(locations.length), sublabel: "All locations", icon: Building2, color: "violet" },
    { key: "screens", label: "Total Screens", value: String(totalScreens), sublabel: "Across all locations", icon: MonitorPlay, color: "blue" },
    { key: "online", label: "Online Screens", value: String(onlineScreens), sublabel: `${pct(onlineScreens)} of all screens`, icon: Signal, color: "emerald" },
    { key: "offline", label: "Offline Screens", value: String(offlineScreens), sublabel: `${pct(offlineScreens)} of all screens`, icon: WifiOff, color: "amber" },
    { key: "rooms", label: "Total Rooms", value: String(totalRooms), sublabel: "Across all locations", icon: DoorOpen, color: "fuchsia" },
  ];
}
