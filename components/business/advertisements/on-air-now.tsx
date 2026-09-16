"use client";

import { FileImage, FileText, Monitor, Music, Radio, Video, VolumeX } from "lucide-react";

import type { LiveAdStatus } from "@/lib/business/ad-analytics";
import { formatCount, formatCountdown } from "./format";
import { useNow } from "./use-live-ad-status";
import { cn } from "@/lib/utils";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;

export function OnAirNow({ status, className }: { status: LiveAdStatus; className?: string }) {
  const now = useNow(status.onAir.length > 0);
  const onAir = status.onAir.filter((a) => now === null || Date.parse(a.endsAt) > now - 2000);

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="relative flex size-2.5">
            {onAir.length > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-60" />}
            <span className={cn("relative inline-flex size-2.5 rounded-full", onAir.length > 0 ? "bg-rose-500" : "bg-muted-foreground/40")} />
          </span>
          On Air Now
        </h2>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{formatCount(status.totalPlaysToday)}</span> plays ·{" "}
          <span className="font-mono font-semibold text-foreground">{formatCount(status.airingsToday)}</span> airings today
        </p>
      </div>

      {!status.schemaReady ? (
        <p className="mt-3 text-sm text-muted-foreground">Live ad serving turns on once the ad-serving database update is applied.</p>
      ) : onAir.length === 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Radio className="size-4 shrink-0" />
          No ads on air right now. Due campaigns take over their screens automatically.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {onAir.map((airing) => {
            const Icon = airing.contentType ? TYPE_ICON[airing.contentType] : Video;
            const start = Date.parse(airing.startedAt);
            const end = Date.parse(airing.endsAt);
            const pct = now === null || end <= start ? 0 : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
            return (
              <li key={airing.breakId} className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-400">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {airing.campaignName}
                      {airing.advertiser && <span className="font-normal text-muted-foreground"> · {airing.advertiser}</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="truncate">{airing.placeLabel}</span>
                      {airing.screenCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="size-3" /> {airing.screenCount}
                        </span>
                      )}
                      {airing.pausesMusic && (
                        <span className="inline-flex items-center gap-1">
                          <VolumeX className="size-3" /> music paused
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-rose-300 tabular-nums">
                    {now === null ? "—" : formatCountdown(end - now)}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-rose-500/15">
                  <div className="h-full rounded-full bg-rose-500 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
