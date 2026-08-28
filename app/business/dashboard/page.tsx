import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { StatTile } from "@/components/business/stat-tile";
import { LocationsPanel } from "@/components/business/dashboard/locations-panel";
import { NowPlayingPanel } from "@/components/business/dashboard/now-playing-panel";
import { QuickActions } from "@/components/business/dashboard/quick-actions";
import { EngagementChart } from "@/components/business/dashboard/engagement-chart";
import { TopContentTable } from "@/components/business/dashboard/top-content-table";
import { AnnouncementsPanel } from "@/components/business/dashboard/announcements-panel";
import { ScreenStatusDonut } from "@/components/business/dashboard/screen-status-donut";
import { PromoBanner } from "@/components/business/dashboard/promo-banner";
import { MOCK_STATS } from "@/components/business/dashboard/mock-data";

export const metadata: Metadata = { title: "Business Dashboard" };

/**
 * Static preview of the redesigned dashboard — every panel below the auth
 * guard renders placeholder content (see components/business/dashboard/mock-data.ts),
 * not live Supabase data. Swap panel-by-panel once each concept (screens,
 * playlists, ads) has a real backing table.
 */
export default async function BusinessDashboardPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back 
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across {viewer.businessName} today.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {MOCK_STATS.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <LocationsPanel />
        </div>
        <div className="xl:col-span-4">
          <NowPlayingPanel />
        </div>
        <div className="xl:col-span-3">
          <QuickActions />
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 xl:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Engagement Overview</h2>
            <span className="font-mono text-xs text-muted-foreground">Today</span>
          </div>
          <div className="mt-4">
            <EngagementChart />
          </div>
        </div>
        <div className="xl:col-span-3">
          <TopContentTable />
        </div>
        <div className="xl:col-span-3">
          <AnnouncementsPanel />
        </div>
        <div className="xl:col-span-2">
          <ScreenStatusDonut />
        </div>
      </div>

      <PromoBanner />
    </div>
  );
}
