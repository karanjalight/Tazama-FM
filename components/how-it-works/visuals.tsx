"use client";

import {
  ArrowRight,
  Crown,
  GripVertical,
  Maximize2,
  Plus,
  SkipBack,
  SkipForward,
  Video,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { LiveBadge } from "@/components/live/live-badge";
import { PlayableCover } from "@/components/landing/playable-cover";
import { useLandingPlayer } from "@/components/landing/landing-player";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/** "Everyone at the same second" — synced playback across listeners. */
export function SyncVisual({ tracks }: { tracks: Track[] }) {
  const now = tracks[0];
  const listeners = [
    { initials: "AN", name: "Amara" },
    { initials: "JK", name: "Jelani" },
    { initials: "ZM", name: "Zuri" },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7 dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <Equalizer className="h-4" bars={4} barClassName="w-1" />
          <span className="text-sm font-medium text-foreground">
            Sunset Sessions
          </span>
        </span>
        <LiveBadge label="Live" />
      </div>

      <div className="mt-5 flex items-center gap-4">
        {now ? (
          <PlayableCover track={now} className="size-16 rounded-2xl" sizes="64px" />
        ) : (
          <Cover title="Tazama" className="size-16 rounded-2xl" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-foreground">
            {now?.title ?? "Now playing"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {now?.artist ?? "Tazama"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand" style={{ width: "36%" }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
          <span>1:24</span>
          <span>3:58</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {listeners.map((m) => (
          <div
            key={m.initials}
            className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {m.initials}
              </span>
              <span className="text-sm font-medium text-foreground">
                {m.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-live" aria-hidden="true" />
              1:24
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Everyone locked to the same second.
      </p>
    </div>
  );
}

/** Shared queue with a host-controlled "Up Next" list — real, playable tracks. */
export function QueueVisual({ tracks }: { tracks: Track[] }) {
  const { play, toggle, isPlaying, isCurrent } = useLandingPlayer();
  const now = tracks[0];
  const queue = tracks.slice(1, 4);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7 dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Up Next</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Crown className="size-3.5" aria-hidden="true" />
          Host controls the queue
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
        {now ? (
          <PlayableCover
            track={now}
            compact
            className="size-12 rounded-xl"
            sizes="48px"
          />
        ) : (
          <Cover title="Tazama" className="size-12 rounded-xl" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {now?.title ?? "Now playing"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {now?.artist ?? "Tazama"}
          </p>
        </div>
        <Equalizer className="h-3.5" bars={3} barClassName="w-[3px]" />
      </div>

      <ul className="mt-3 space-y-1">
        {queue.map((t, i) => {
          const cur = isCurrent(t.youtubeId);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() =>
                  cur
                    ? toggle()
                    : play({
                        youtubeId: t.youtubeId,
                        title: t.title,
                        artist: t.artist,
                        thumbnailUrl: t.thumbnailUrl,
                      })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="w-4 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <Cover
                  title={t.title}
                  src={t.thumbnailUrl ?? undefined}
                  sizes="36px"
                  className="size-9 rounded-lg"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      cur && isPlaying ? "text-brand" : "text-foreground",
                    )}
                  >
                    {t.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.artist ?? "Unknown artist"}
                  </span>
                </span>
                <GripVertical
                  className="size-4 text-muted-foreground/50"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
        <Plus className="size-4" aria-hidden="true" />
        Add a song to the queue
      </div>
    </div>
  );
}

/** Player with crossfade, fullscreen/video controls — real, playable tracks. */
export function PlayerVisual({ tracks }: { tracks: Track[] }) {
  const { toggle, play, isPlaying, isCurrent } = useLandingPlayer();
  const a = tracks[0];
  const b = tracks[1];
  const aCur = a ? isCurrent(a.youtubeId) : false;

  return (
    <div className="rounded-3xl border border-white/10 bg-surface p-6 text-white shadow-dark sm:p-7">
      <div className="flex items-center justify-center gap-4">
        {a ? (
          <PlayableCover track={a} className="size-20 rounded-2xl ring-1 ring-white/10" sizes="80px" />
        ) : (
          <Cover title="Tazama" className="size-20 rounded-2xl ring-1 ring-white/10" />
        )}
        <div className="flex flex-col items-center text-white/50">
          <ArrowRight className="size-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold tracking-wider uppercase">
            Crossfade
          </span>
        </div>
        {b ? (
          <PlayableCover track={b} className="size-20 rounded-2xl ring-1 ring-white/10" sizes="80px" />
        ) : (
          <Cover title="Tazama" className="size-20 rounded-2xl ring-1 ring-white/10" />
        )}
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-brand" style={{ width: "82%" }} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/75">
          <SkipBack className="size-4 fill-current" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              if (aCur) toggle();
              else if (a)
                play({
                  youtubeId: a.youtubeId,
                  title: a.title,
                  artist: a.artist,
                  thumbnailUrl: a.thumbnailUrl,
                });
            }}
            aria-label={aCur && isPlaying ? "Pause" : "Play"}
            className="grid size-9 place-items-center rounded-full bg-white text-ink transition-transform hover:scale-105 active:scale-95"
          >
            {aCur && isPlaying ? (
              <span className="block h-3.5 w-3.5">
                <span className="flex h-full items-center justify-center gap-[3px]">
                  <span className="h-3.5 w-[3px] rounded-full bg-ink" />
                  <span className="h-3.5 w-[3px] rounded-full bg-ink" />
                </span>
              </span>
            ) : (
              <span className="ml-0.5 block size-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-ink" />
            )}
          </button>
          <SkipForward className="size-4 fill-current" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-grid size-8 place-items-center rounded-full bg-white/10 text-white/80">
            <Maximize2 className="size-4" aria-hidden="true" />
          </span>
          <span className="inline-grid size-8 place-items-center rounded-full bg-white/10 text-white/80">
            <Video className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
          Up next, suggested
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {["More like this", "Keep it mellow", "Pick up the pace"].map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
