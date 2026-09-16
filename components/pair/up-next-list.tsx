"use client";

import { Heart, ListMusic, Music2, Plus, X } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import { queuePositionLabel } from "@/lib/pair/request-rules";
import type { PairRequest, PairUpcoming } from "@/lib/pair/types";

/** Requests (first come, first served) then what the playlist plays after. */
export function UpNextList({
  requests,
  upcoming,
  onLike,
  onRemove,
  onRequest,
}: {
  requests: PairRequest[];
  upcoming: PairUpcoming;
  onLike: (item: PairRequest) => void;
  onRemove: (item: PairRequest) => void;
  onRequest: () => void;
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListMusic className="size-4 text-brand" />
            Requests
          </h2>
          {requests.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{requests.length}</span>
          )}
        </header>

        {requests.length === 0 ? (
          <button
            type="button"
            onClick={onRequest}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3 py-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <Plus className="size-4" />
            </span>
            No requests yet. Pick the next song.
          </button>
        ) : (
          <ol className="space-y-0.5">
            {requests.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl p-1.5">
                <Cover
                  title={item.track.title}
                  src={item.track.thumbnailUrl ?? undefined}
                  sizes="44px"
                  className="size-11 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.track.title || "Untitled"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className={cn(index === 0 && "font-medium text-brand")}>{queuePositionLabel(index)}</span>
                    {" · "}
                    {item.mine ? "You" : (item.addedByName ?? "A guest")}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={item.likedByMe ? "Unlike" : "Like"}
                  aria-pressed={item.likedByMe}
                  onClick={() => onLike(item)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs transition-colors",
                    item.likedByMe ? "text-brand" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Heart className={cn("size-4", item.likedByMe && "fill-current")} />
                  <span className="font-mono tabular-nums">{item.likeCount}</span>
                </button>

                {item.mine && (
                  <button
                    type="button"
                    aria-label="Remove my request"
                    onClick={() => onRemove(item)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {upcoming.kind !== "none" && (
        <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
            <Music2 className="size-4" />
            {requests.length ? "After the requests" : "Coming up"}
          </h2>
          {upcoming.kind === "mix" ? (
            <p className="px-1 pb-1 text-sm text-foreground">{upcoming.label}</p>
          ) : (
            <ol className="space-y-0.5">
              {upcoming.tracks.map((track, i) => (
                <li key={`${track.youtubeId}-${i}`} className="flex items-center gap-3 rounded-xl p-1.5">
                  <Cover title={track.title} src={track.thumbnailUrl ?? undefined} sizes="40px" className="size-10 shrink-0 rounded-lg opacity-90" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{track.title || "Untitled"}</p>
                    <p className="truncate text-xs text-muted-foreground">{track.artist ?? "Unknown artist"}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
