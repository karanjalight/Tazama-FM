"use client";

import { Heart, Play, X, ListMusic } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/lib/rooms/types";

/**
 * The collaborative up-next list. Everyone can like (likes upvote and reorder);
 * the host can play any track now or remove it. Ordering is decided server-side
 * (most-liked first), so this just renders what it's given.
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ListMusic className="size-4" />
        Up next
        {items.length > 0 && (
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h3>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          The queue is empty. Add a track — most-liked plays next.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/60"
            >
              <Cover
                title={item.track.title}
                src={item.track.thumbnailUrl ?? undefined}
                sizes="40px"
                className="size-10 shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.track.title || "Untitled"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.track.artist ?? "Unknown"}
                  {item.addedByName ? ` · added by ${item.addedByName}` : ""}
                </p>
              </div>

              <button
                type="button"
                aria-label={isHost ? "Play now" : "Play on my player"}
                onClick={() => onPlayNow(item)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-foreground hover:text-background group-hover:opacity-100"
              >
                <Play className="size-3.5 fill-current" />
              </button>

              <button
                type="button"
                aria-label={item.likedByMe ? "Unlike" : "Like"}
                aria-pressed={item.likedByMe}
                onClick={() => onLike(item)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors",
                  item.likedByMe
                    ? "text-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart
                  className={cn("size-3.5", item.likedByMe && "fill-current")}
                />
                <span className="font-mono">{item.likeCount}</span>
              </button>

              {isHost && (
                <button
                  type="button"
                  aria-label="Remove from queue"
                  onClick={() => onRemove(item)}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
