import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, CalendarClock, CheckCircle2, PauseCircle, FileEdit } from "lucide-react";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { listSchedulesForBranch } from "@/lib/business/schedule-queries";
import { SchedulesWorkspace } from "@/components/business/schedules/schedules-workspace";
import { StatTile, type StatItem } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Schedules — Business Dashboard" };

export default async function SchedulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const branch = await getBranchByIdOrSlug(viewer.businessId, id);
  if (!branch || !canActOnBranch(viewer, branch.id)) notFound();

  const schedules = await listSchedulesForBranch(branch.id);

  const stats: StatItem[] = [
    { key: "total", label: "Total Schedules", value: String(schedules.length), sublabel: "All statuses", icon: CalendarClock, color: "violet" },
    { key: "active", label: "Active", value: String(schedules.filter((s) => s.status === "active").length), sublabel: "Running now", icon: CheckCircle2, color: "emerald" },
    { key: "draft", label: "Draft", value: String(schedules.filter((s) => s.status === "draft").length), sublabel: "Not yet activated", icon: FileEdit, color: "amber" },
    { key: "paused", label: "Paused", value: String(schedules.filter((s) => s.status === "paused").length), sublabel: "Not running", icon: PauseCircle, color: "rose" },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/business/branches" className="hover:text-foreground">
          Locations
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/business/branches/${branch.slug}`} className="hover:text-foreground">
          {branch.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Schedules</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan and automate content and playlists — layered on top of your Audio Zones.
          </p>
        </div>
        <Link
          href={`/business/branches/${branch.slug}/schedules/new`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="size-4" />
          Create Schedule
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <SchedulesWorkspace branchId={branch.id} schedules={schedules} />
    </div>
  );
}
