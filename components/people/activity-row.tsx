"use client";

import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { UserCard } from "@/components/people/user-card";
import { usePlayer } from "@/components/player/player-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/social/play-history";

/** A card for the global Activity feed — who, what, and when, tappable to play. */
export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const { play } = usePlayer();

  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-soft transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift">
      <UserCard
        id={entry.userId}
        fullName={entry.fullName}
        avatarKey={entry.avatarKey}
        subtitle={formatRelativeTime(entry.playedAt)}
        className="border-0 bg-transparent p-0 hover:border-0"
      />
      <button
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
        className="group mt-3 flex w-full items-center gap-3 text-left"
      >
        <span className="relative block size-14 shrink-0">
          <Cover
            src={entry.thumbnailUrl ?? undefined}
            title={entry.title}
            sizes="56px"
            className="size-14 rounded-xl"
          />
          <span className="absolute inset-0 grid place-items-center rounded-xl opacity-0 transition-opacity group-hover:opacity-100">
            <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white">
              <Play className="size-3.5 translate-x-0.5 fill-current" />
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
          <p className="truncate text-xs text-muted-foreground">{entry.artist}</p>
        </div>
      </button>
    </div>
  );
}
