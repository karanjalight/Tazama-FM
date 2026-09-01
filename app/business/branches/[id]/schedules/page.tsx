import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { LOCATION_NAME, SCHEDULE_STATS } from "@/components/business/schedules/mock-data";
import { SchedulesWorkspace } from "@/components/business/schedules/schedules-workspace";
import { StatTile } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Schedules — Business Dashboard" };

/**
 * Static preview of a per-location "Schedules" list page — built as the
 * supporting parent for the Create Schedule wizard, same "[id] not used for
 * a real lookup" pattern as the sibling Rooms & Zones / Screens & Devices /
 * Audio Zones / Content Library pages.
 */
export default async function SchedulesPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/business/branches" className="hover:text-foreground">
          Locations
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/business/branches" className="hover:text-foreground">
          {LOCATION_NAME}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Schedules</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan and automate content, playlists, advertisements and announcements.
          </p>
        </div>
        <Link
          href="/business/branches/nairobi-cbd/schedules/new"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="size-4" />
          Create Schedule
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SCHEDULE_STATS.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <SchedulesWorkspace />
    </div>
  );
}
