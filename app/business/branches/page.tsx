import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { StatTile } from "@/components/business/stat-tile";
import { LocationsWorkspace } from "@/components/business/branches/locations-workspace";
import { LOCATION_STATS } from "@/components/business/branches/mock-data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Locations — Business Dashboard" };

/**
 * Static preview of the redesigned Locations page — every panel below the
 * auth guard renders placeholder content (see components/business/branches/mock-data.ts),
 * not live Supabase data. The real branch list/create/pairing flow
 * (components/business/branch-list.tsx & friends) is untouched on disk;
 * wire it back in panel-by-panel once this design is ready to go live.
 */
export default async function BranchesPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

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
          <Plus className="size-4" />
          Add Location
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LOCATION_STATS.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <LocationsWorkspace />
    </div>
  );
}
