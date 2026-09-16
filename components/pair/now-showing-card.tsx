"use client";

import * as React from "react";
import { Headphones, Loader2, Megaphone, Sparkles, VolumeX } from "lucide-react";

import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { FloatingReactions, type FloatingItem } from "@/components/rooms/room-reactions";
import { ScheduleContentDisplay } from "@/components/business/schedules/schedule-content-display";
import { adAsContent, type VenueAd } from "@/lib/pair/venue-ad";
import { cn } from "@/lib/utils";
import type { ScheduleContentSnapshot } from "@/lib/business/schedule-types";
import type { PairNowPlaying } from "@/lib/pair/types";

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Wall clock that ticks once a second, so the mirrored progress bar moves
 * without a player. Starts at 0 (not Date.now()) to keep render pure. */
function useSecondTicker(): number {
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

/** What the paired screen is showing right now, mirrored on the phone. */
export function NowShowingCard({
  nowPlaying,
  content,
  ad,
  listening,
  listenBuffering,
  playerRef,
  reactions,
  onToggleListen,
}: {
  nowPlaying: PairNowPlaying;
  content: ScheduleContentSnapshot | null;
  ad: VenueAd | null;
  listening: boolean;
  listenBuffering: boolean;
  playerRef: React.RefCallback<HTMLDivElement>;
  reactions: FloatingItem[];
  onToggleListen: () => void;
}) {
  const now = useSecondTicker();
  const { track, durationMs } = nowPlaying;
  const rawPosition = now && nowPlaying.isPlaying ? nowPlaying.positionMs + (now - nowPlaying.at) : nowPlaying.positionMs;
  const positionMs = durationMs ? Math.min(Math.max(rawPosition, 0), durationMs) : Math.max(rawPosition, 0);
  // An airing ad sits above schedule signage, exactly like on the screen.
  const overlay = ad ? adAsContent(ad) : content;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {track && (
          <div className={cn("absolute inset-0 transition-opacity duration-500", listening ? "opacity-0" : "opacity-100")}>
            <Cover
              src={track.thumbnailUrl ?? undefined}
              title={track.title}
              sizes="100vw"
              className="absolute inset-0 aspect-auto size-full scale-110 rounded-none opacity-50 blur-2xl"
            />
            <div className="absolute inset-0 grid place-items-center">
              <Cover
                src={track.thumbnailUrl ?? undefined}
                title={track.title}
                sizes="(max-width: 768px) 40vw, 220px"
                className="w-[38%] max-w-56 shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* The YouTube host: always mounted, never moved — shown only while
            listening (see usePhoneListen). */}
        <div className={cn("absolute inset-0", listening ? "opacity-100" : "pointer-events-none opacity-0")}>
          <div ref={playerRef} className="size-full" />
        </div>

        {!track && !overlay && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/60">
            Nothing is playing right now
          </div>
        )}

        <ScheduleContentDisplay content={overlay} className="absolute inset-0" />

        {overlay && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {ad ? <Megaphone className="size-3" /> : <Sparkles className="size-3" />}
            {ad ? "Ad on screen" : "On screen now"}
          </span>
        )}

        <FloatingReactions items={reactions} />
      </div>

      <div className="space-y-3 p-4">
        {nowPlaying.requestedByName && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
            <Sparkles className="size-3 shrink-0" />
            <span className="truncate">Requested by {nowPlaying.requestedByName}</span>
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{track?.title || "Waiting for the next song"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {track ? (track.artist ?? "Unknown artist") : "The screen will pick something soon"}
          </p>
        </div>

        {track && durationMs ? (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear"
                style={{ width: `${(positionMs / durationMs) * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
              <span>{formatMs(positionMs)}</span>
              <span>{formatMs(durationMs)}</span>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant={listening ? "outline" : "brand"}
          className="h-11 w-full rounded-full"
          onClick={onToggleListen}
          disabled={!track && !listening}
        >
          {listening ? (
            <>
              {listenBuffering ? <Loader2 className="size-4 animate-spin" /> : <VolumeX className="size-4" />}
              Stop listening on my phone
            </>
          ) : (
            <>
              <Headphones className="size-4" />
              Listen on my phone
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
