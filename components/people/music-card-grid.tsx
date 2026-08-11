"use client";

import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import type { ActivityEntry } from "@/lib/social/play-history";

/**
 * A profile's "posts grid" — Instagram's own grid is bare images with zero
 * caption, but a bare cover doesn't tell you what song it is, so this keeps
 * one small truncated title line under each square. Tapping a card plays it.
 */
export function MusicCardGrid({ entries }: { entries: ActivityEntry[] }) {
  const { play } = usePlayer();

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity to show.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
      {entries.map((entry, i) => (
        <button
          key={`${entry.youtubeId}-${i}`}
          type="button"
          onClick={() =>
            play({
              id: entry.youtubeId,
              youtubeId: entry.youtubeId,
              title: entry.title,
              artist: entry.artist,
              thumbnailUrl: entry.thumbnailUrl,
            })
          }
          aria-label={`Play ${entry.title}`}
          className="group text-left"
        >
          <span className="relative block">
            <Cover
              src={entry.thumbnailUrl ?? undefined}
              title={entry.title}
              sizes="(max-width: 640px) 33vw, 220px"
              className="rounded-lg transition-opacity group-hover:opacity-90"
            />
            <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white">
                <Play className="size-3.5 translate-x-0.5 fill-current" />
              </span>
            </span>
          </span>
          <p className="mt-1 truncate text-xs text-muted-foreground">{entry.title}</p>
        </button>
      ))}
    </div>
  );
}
