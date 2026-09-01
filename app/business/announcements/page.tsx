import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, MonitorSpeaker, Send, Megaphone } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listAnnouncements, getAnnouncementTargetOptions } from "@/lib/business/announcement-queries";
import { AnnouncementsWorkspace } from "@/components/business/announcements/announcements-workspace";
import type { Announcement } from "@/lib/business/announcement-types";
import { StatTile, type StatItem } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Announcements — Business Dashboard" };

export default async function AnnouncementsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const [announcements, targetOptions] = await Promise.all([
    listAnnouncements(viewer.businessId),
    getAnnouncementTargetOptions(viewer),
  ]);

  const stats = buildAnnouncementStats(announcements, targetOptions.audioZones.length);

  return (
    <div className="space-y-6">
      {/* StatTile's `icon` is a lucide component reference — not serializable
          across the server→client boundary, so the stats grid renders here
          (a Server Component) rather than being passed as a prop into the
          "use client" workspace below it. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <AnnouncementsWorkspace
        businessId={viewer.businessId}
        announcements={announcements}
        targetOptions={targetOptions}
      />
    </div>
  );
}

function buildAnnouncementStats(announcements: Announcement[], activeAudioZoneCount: number): StatItem[] {
  const now = new Date();
  const isToday = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const isThisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const sent = announcements.filter((a) => a.status === "sent");
  const scheduled = announcements.filter((a) => a.status === "scheduled");
  const sentToday = sent.filter((a) => a.sentAt && isToday(a.sentAt));
  const sentThisMonth = sent.filter((a) => a.sentAt && isThisMonth(a.sentAt));

  return [
    { key: "total", label: "Total Announcements", value: String(announcements.length), sublabel: "All time", icon: Megaphone, color: "violet" },
    { key: "sent-today", label: "Sent Today", value: String(sentToday.length), sublabel: "Across all locations", icon: Send, color: "emerald" },
    { key: "scheduled", label: "Scheduled", value: String(scheduled.length), sublabel: "Upcoming", icon: CalendarClock, color: "amber" },
    { key: "this-month", label: "This Month", value: String(sentThisMonth.length), sublabel: "Total sent", icon: CheckCircle2, color: "blue" },
    { key: "active-audio-zones", label: "Active Audio Zones", value: String(activeAudioZoneCount), sublabel: "Can receive announcements", icon: MonitorSpeaker, color: "fuchsia" },
  ];
}
