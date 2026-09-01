"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, FileImage, Music, Pause, Pencil, Play, Video } from "lucide-react";

import { CREATIVES, type Campaign } from "../mock-data";
import { TARGET_TREE, totalScreensFor } from "../types";
import { CampaignStatusPill } from "../campaign-status-pill";
import { HorizontalBars } from "@/components/business/analytics/charts/horizontal-bars";

const TYPE_ICON = { Video, Image: FileImage, Audio: Music } as const;

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CampaignDetailView({ campaign, onBack, onToggleStatus }: { campaign: Campaign; onBack: () => void; onToggleStatus: (id: string) => void }) {
  const creative = campaign.creativeId ? CREATIVES.find((c) => c.id === campaign.creativeId) : null;
  const Icon = creative ? TYPE_ICON[creative.format] : Video;
  const screens = totalScreensFor(campaign.roomIds);
  const locationNames = TARGET_TREE.filter((l) => campaign.locationIds.includes(l.id)).map((l) => l.name);
  const zoneNames = TARGET_TREE.flatMap((l) => l.zones).filter((z) => campaign.zoneIds.includes(z.id)).map((z) => z.name);
  const roomNames = TARGET_TREE.flatMap((l) => l.zones.flatMap((z) => z.rooms)).filter((r) => campaign.roomIds.includes(r.id)).map((r) => r.name);

  const start = new Date(campaign.startDate).getTime();
  const end = new Date(campaign.endDate).getTime();
  // Date.now() reads the wall clock, which React's purity rules disallow
  // calling directly during render — deferred into a timeout callback
  // instead (this project's lint also disallows calling setState
  // synchronously in an effect body).
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);
  const timelinePct = now === null ? 0 : Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));

  const locationBars = locationNames.map((name, i) => ({ id: name, name, value: Math.round((campaign.reach / locationNames.length) * (1 - i * 0.15)) }));
  const roomBars = roomNames.slice(0, 5).map((name, i) => ({ id: name, name, value: Math.round((campaign.plays / roomNames.length) * (1 - i * 0.1)) }));

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Campaigns
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{campaign.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <CampaignStatusPill status={campaign.status} />
            <span className="text-sm text-muted-foreground">{campaign.advertiser}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleStatus(campaign.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {campaign.status === "Active" ? <Pause className="size-4" /> : <Play className="size-4" />}
            {campaign.status === "Active" ? "Pause Campaign" : "Resume Campaign"}
          </button>
          <button
            type="button"
            onClick={() => toast.info("Editing isn't wired up in this preview yet")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Pencil className="size-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-xl font-bold text-foreground">{campaign.plays.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Ad Plays</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-xl font-bold text-foreground">{campaign.reach.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Estimated Reach</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-xl font-bold text-emerald-400">{campaign.completionPct}%</p>
          <p className="text-xs text-muted-foreground">Completion</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-xl font-bold text-foreground">{screens}</p>
          <p className="text-xs text-muted-foreground">Screens</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Campaign Timeline</h2>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(campaign.startDate)}</span>
          <span>{formatDate(campaign.endDate)}</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${timelinePct}%` }} />
        </div>
        <p className="mt-2 text-sm font-medium text-violet-400">{campaign.status}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Creative</h2>
          <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-muted">
            {creative?.thumbnail ? (
              <Image src={creative.thumbnail} alt="" fill sizes="500px" className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                <Icon className="size-8 text-foreground/40" />
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {creative?.durationLabel ?? "—"} · {creative?.format ?? "—"}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => toast.info("Preview isn't wired up in this preview yet")} className="flex-1 rounded-xl border border-input py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              Preview
            </button>
            <button type="button" onClick={() => toast.info("Replacing the creative isn't wired up yet")} className="flex-1 rounded-xl border border-input py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              Replace Creative
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Targeting</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Locations</p>
              <p className="text-foreground">{locationNames.join(", ") || "—"}</p>
            </div>
            {zoneNames.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Zones</p>
                <p className="text-foreground">{zoneNames.join(", ")}</p>
              </div>
            )}
            {roomNames.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Rooms</p>
                <p className="text-foreground">{roomNames.join(", ")}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Screens</p>
              <p className="font-medium text-foreground">{screens} selected</p>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="text-xs text-muted-foreground">Placement</p>
            <p className="text-foreground">{campaign.placementType}</p>
            <p className="mt-1 text-xs text-muted-foreground">Frequency</p>
            <p className="text-foreground">{campaign.frequency}</p>
            <p className="mt-1 text-xs text-muted-foreground">Maximum</p>
            <p className="text-foreground">{campaign.maxPlaysPerDay} plays/day/screen</p>
            <p className="mt-1 text-xs text-muted-foreground">Priority</p>
            <p className="text-foreground">{campaign.priority}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Performance</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Performance by Location</p>
            <HorizontalBars items={locationBars} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Performance by Screen</p>
            <HorizontalBars items={roomBars} />
          </div>
        </div>
      </div>
    </div>
  );
}
