"use client";

import { Heart, ListMusic, Play, X } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/lib/rooms/types";

/**
 * The collaborative up-next list. Tap a track's artwork/title to play it;
 * everyone can like (likes upvote + reorder); the host can remove. Ordering is
 * decided server-side (most-liked first), so this just renders what it's given.
 */
export function QueuePanel({
  items,
  isHost,
  onLike,
  onRemove,
  onPlayNow,
}: {
  items: QueueItem[];
  isHost: boolean;
  onLike: (item: QueueItem) => void;
  onRemove: (item: QueueItem) => void;
  onPlayNow: (item: QueueItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListMusic className="size-4 text-brand" />
          Up next
        </h3>
        {items.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-1 pb-1 text-xs leading-relaxed text-muted-foreground">
          The queue is empty — add a track and the most-liked plays next.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-1.5 rounded-xl p-1.5 transition-colors hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => onPlayNow(item)}
                aria-label={
                  isHost
                    ? `Play ${item.track.title}`
                    : `Play ${item.track.title} on my player`
                }
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="relative shrink-0">
                  <Cover
                    title={item.track.title}
                    src={item.track.thumbnailUrl ?? undefined}
                    sizes="44px"
                    className="size-11 rounded-lg"
                  />
                  <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-4 fill-white text-white" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.track.title || "Untitled"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.track.artist ?? "Unknown"}
                    {item.addedByName ? ` · ${item.addedByName}` : ""}
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-label={item.likedByMe ? "Unlike" : "Like"}
                aria-pressed={item.likedByMe}
                onClick={() => onLike(item)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs transition-colors",
                  item.likedByMe
                    ? "text-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart className={cn("size-4", item.likedByMe && "fill-current")} />
                <span className="font-mono tabular-nums">{item.likeCount}</span>
              </button>

              {isHost && (
                <button
                  type="button"
                  aria-label="Remove from queue"
                  onClick={() => onRemove(item)}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
