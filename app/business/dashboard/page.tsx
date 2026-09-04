import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, Megaphone, MonitorPlay, Signal, Users } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getBranchCardSummaries } from "@/lib/business/queries";
import { listLocationSummaries, type LocationSummary } from "@/lib/business/locations-queries";
import {
  listDeviceStatusSummaries,
  type DeviceStatusSummary,
} from "@/lib/business/device-queries";
import { listAnnouncements, getAnnouncementTargetOptions } from "@/lib/business/announcement-queries";
import {
  targetSummaryLabel,
  formatAnnouncementTimestamp,
  type Announcement,
  type AnnouncementTargetOptions,
} from "@/lib/business/announcement-types";
import type { BranchCardSummary } from "@/lib/business/types";
import { StatTile, type StatItem } from "@/components/business/stat-tile";
import { LocationsPanel, type DashboardLocation } from "@/components/business/dashboard/locations-panel";
import {
  NowPlayingPanel,
  type DashboardNowPlayingEntry,
} from "@/components/business/dashboard/now-playing-panel";
import { QuickActions } from "@/components/business/dashboard/quick-actions";
import { EngagementChart } from "@/components/business/dashboard/engagement-chart";
import { TopContentTable } from "@/components/business/dashboard/top-content-table";
import {
  AnnouncementsPanel,
  type DashboardAnnouncementEntry,
} from "@/components/business/dashboard/announcements-panel";
import {
  ScreenStatusDonut,
  type DashboardOfflineScreen,
  type DashboardScreenStatus,
} from "@/components/business/dashboard/screen-status-donut";
import { PromoBanner } from "@/components/business/dashboard/promo-banner";
import { PREVIEW_STATS } from "@/components/business/dashboard/mock-data";

export const metadata: Metadata = { title: "Business Dashboard" };

/**
 * Locations, screens, online/offline status, recent announcements,
 * now-playing and active-user counts below are real Supabase reads.
 * Engagement Overview and Top Content's plays/engagement figures stay on
 * mock-data.ts (no analytics-event log exists yet), and the promo banner
 * stays static (no ad backend exists yet — see
 * components/business/advertisements' own mock-data for that story).
 */
export default async function BusinessDashboardPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const [locations, branchSummaries, announcements, targetOptions] = await Promise.all([
    listLocationSummaries(viewer.businessId),
    getBranchCardSummaries(viewer.businessId),
    listAnnouncements(viewer.businessId),
    getAnnouncementTargetOptions(viewer),
  ]);

  const devices = await listDeviceStatusSummaries(locations.map((l) => l.id));

  // Both the stat tiles and the Locations panel derive their online/offline/
  // pending counts from this same per-branch device breakdown as the Screen
  // Status donut — a device that never connected is "Pending" everywhere on
  // this page, not "Offline" in one panel and "Pending" in another.
  const { status, offlineScreens } = buildScreenStatus(locations, devices);
  const dashboardLocations = buildDashboardLocations(locations, devices);

  const stats: StatItem[] = [
    ...buildDashboardStats(status, locations, branchSummaries, announcements),
    ...PREVIEW_STATS,
  ];
  const nowPlayingEntries = buildNowPlayingEntries(branchSummaries);
  const announcementEntries = buildAnnouncementEntries(announcements, targetOptions);
  const defaultBranchSlug = locations[0]?.slug ?? null;

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
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <LocationsPanel locations={dashboardLocations} />
        </div>
        <div className="xl:col-span-4">
          <NowPlayingPanel entries={nowPlayingEntries} />
        </div>
        <div className="xl:col-span-3">
          <QuickActions defaultBranchSlug={defaultBranchSlug} />
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
          <AnnouncementsPanel announcements={announcementEntries} />
        </div>
        <div className="xl:col-span-2">
          <ScreenStatusDonut status={status} offlineScreens={offlineScreens} />
        </div>
      </div>

      <PromoBanner />
    </div>
  );
}

function isSameCalendarDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatSince(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes ? `${hours}h ${remMinutes}m ago` : `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function buildDashboardStats(
  screenStatus: DashboardScreenStatus,
  locations: LocationSummary[],
  branchSummaries: BranchCardSummary[],
  announcements: Announcement[],
): StatItem[] {
  const { total: totalScreens, online: onlineScreens, offline: offlineScreens, pending: pendingScreens } =
    screenStatus;

  const now = new Date();
  const sentToday = announcements.filter(
    (a) => a.status === "sent" && a.sentAt && isSameCalendarDay(a.sentAt, now),
  ).length;

  const liveUsers = branchSummaries.reduce((sum, s) => sum + s.liveVisitorCount, 0);

  const screensSublabel = [`${onlineScreens} online`, `${offlineScreens} offline`];
  if (pendingScreens > 0) screensSublabel.push(`${pendingScreens} pending`);

  return [
    {
      key: "locations",
      label: "Locations",
      value: String(locations.length),
      sublabel: locations.length ? "All locations" : "No locations yet",
      icon: Building2,
      color: "violet",
    },
    {
      key: "screens",
      label: "Screens",
      value: String(totalScreens),
      sublabel: totalScreens ? screensSublabel.join(" · ") : "No screens paired",
      icon: MonitorPlay,
      color: "blue",
    },
    {
      key: "online",
      label: "Online",
      value: String(onlineScreens),
      sublabel: totalScreens
        ? `${((onlineScreens / totalScreens) * 100).toFixed(1)}% of screens`
        : "—",
      icon: Signal,
      color: "emerald",
    },
    {
      key: "announcements",
      label: "Announcements",
      value: String(sentToday),
      sublabel: "Sent today",
      icon: Megaphone,
      color: "pink",
    },
    {
      key: "users",
      label: "Active Users",
      value: String(liveUsers),
      sublabel: "Live right now",
      icon: Users,
      color: "blue",
    },
  ];
}

function buildDashboardLocations(
  locations: LocationSummary[],
  devices: DeviceStatusSummary[],
): DashboardLocation[] {
  const devicesByBranch = new Map<string, DeviceStatusSummary[]>();
  for (const d of devices) {
    const list = devicesByBranch.get(d.branchId) ?? [];
    list.push(d);
    devicesByBranch.set(d.branchId, list);
  }

  return locations.map((location) => {
    const branchDevices = devicesByBranch.get(location.id) ?? [];
    const roomsById = new Map<string, DashboardLocation["rooms"][number]>();
    let online = 0;
    let offline = 0;
    let pending = 0;
    for (const device of branchDevices) {
      if (device.status === "online") online += 1;
      else if (device.status === "offline") offline += 1;
      else pending += 1;

      if (!device.roomId) continue;
      const room = roomsById.get(device.roomId) ?? {
        id: device.roomId,
        name: device.roomName ?? "Unassigned",
        devices: [],
      };
      room.devices.push({
        id: device.id,
        name: device.name,
        kind: device.kind,
        status: device.status,
      });
      roomsById.set(device.roomId, room);
    }
    return {
      id: location.id,
      name: location.name,
      roomCount: location.rooms,
      screenCount: location.screens,
      online,
      offline,
      pending,
      rooms: [...roomsById.values()],
    };
  });
}

function buildScreenStatus(
  locations: LocationSummary[],
  devices: DeviceStatusSummary[],
): { status: DashboardScreenStatus; offlineScreens: DashboardOfflineScreen[] } {
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  const status: DashboardScreenStatus = { total: devices.length, online: 0, offline: 0, pending: 0 };
  for (const d of devices) status[d.status] += 1;

  const offlineScreens = devices
    .filter((d): d is DeviceStatusSummary & { lastSeenAt: string } => d.status === "offline" && d.lastSeenAt !== null)
    .sort((a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime())
    .slice(0, 5)
    .map((d) => ({
      name: d.name,
      location: locationNameById.get(d.branchId) ?? "Unknown",
      since: formatSince(d.lastSeenAt),
    }));

  return { status, offlineScreens };
}

function buildNowPlayingEntries(branchSummaries: BranchCardSummary[]): DashboardNowPlayingEntry[] {
  return branchSummaries.map((s) => ({
    branchId: s.branch.id,
    branchName: s.branch.name,
    track: s.nowPlaying,
    isPlaying: s.isPlaying,
  }));
}

function buildAnnouncementEntries(
  announcements: Announcement[],
  targetOptions: AnnouncementTargetOptions,
): DashboardAnnouncementEntry[] {
  return announcements.slice(0, 4).map((a) => ({
    id: a.id,
    title: a.title,
    meta: `${a.category} · ${targetSummaryLabel(a.target, targetOptions)}`,
    time: formatAnnouncementTimestamp(a),
  }));
}
