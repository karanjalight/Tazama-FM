import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, ChevronRight, Clock, ExternalLink, Volume2 } from "lucide-react";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { listAudioZonesForBranch } from "@/lib/business/audio-zone-queries";
import { listPlaylists } from "@/lib/business/content-queries";
import { AudioZonesWorkspace } from "@/components/business/audio-zones/audio-zones-workspace";
import { StatTile, type StatItem } from "@/components/business/stat-tile";
import type { AudioZone } from "@/lib/business/audio-zone-types";

export const metadata: Metadata = { title: "Audio Zones — Business Dashboard" };

export default async function AudioZonesPage({
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

  const [zones, rooms, audioZones, playlists] = await Promise.all([
    listZones(branch.id),
    listRooms(branch.id),
    listAudioZonesForBranch(branch.id),
    listPlaylists(viewer.businessId),
  ]);

  const stats = buildAudioZoneStats(audioZones);

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
          <span className="text-foreground">Audio Zones</span>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audio Zones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control what plays, where, and how loud — group rooms into audio zones with their own
          volume, daily schedule, and default playlist.
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

      <AudioZonesWorkspace
        branchId={branch.id}
        audioZones={audioZones}
        zoneOptions={zones.map((z) => ({ id: z.id, name: z.name }))}
        roomOptions={rooms.map((r) => ({ id: r.id, name: r.name }))}
        playlistOptions={playlists.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}

function buildAudioZoneStats(audioZones: AudioZone[]): StatItem[] {
  const activeCount = audioZones.filter((z) => z.status === "active").length;
  const totalSpeakers = audioZones.reduce((sum, z) => sum + z.speakersTotal, 0);
  const totalRooms = new Set(audioZones.flatMap((z) => z.roomIds)).size;
  const activePct = audioZones.length === 0 ? 0 : Math.round((activeCount / audioZones.length) * 100);

  return [
    { key: "total", label: "Total Audio Zones", value: String(audioZones.length), sublabel: "All locations", icon: Volume2, color: "violet" },
    { key: "active", label: "Active Zones", value: String(activeCount), sublabel: `${activePct}% active`, icon: Activity, color: "blue" },
    { key: "speakers", label: "Total Speakers", value: String(totalSpeakers), sublabel: "Across all zones", icon: Volume2, color: "emerald" },
    { key: "rooms", label: "Rooms Covered", value: String(totalRooms), sublabel: "With an audio zone", icon: BarChart3, color: "amber" },
    { key: "avg-volume", label: "Average Volume", value: `${averageVolume(audioZones)}%`, sublabel: "Active zones", icon: Clock, color: "fuchsia" },
  ];
}

function averageVolume(audioZones: AudioZone[]): number {
  const active = audioZones.filter((z) => z.status === "active");
  if (!active.length) return 0;
  return Math.round(active.reduce((sum, z) => sum + z.volume, 0) / active.length);
}
