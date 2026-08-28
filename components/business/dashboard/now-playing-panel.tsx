import { Flame, MoreHorizontal, Music2 } from "lucide-react";

import { MOCK_NOW_PLAYING } from "./mock-data";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const BAR_HEIGHTS = [40, 70, 30, 90, 55, 75, 35, 60, 45, 85, 50, 65, 30, 95, 40];

export function NowPlayingPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Now Playing Across All Screens
        </h2>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View playlist
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-linear-to-br from-rose-500/25 to-amber-500/25 text-foreground">
          <Music2 className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
            {MOCK_NOW_PLAYING.playlistName}
            <Flame className="size-3.5 text-amber-400" />
          </p>
          <p className="text-xs text-muted-foreground">Curated Playlist</p>
          <div
            aria-hidden="true"
            className="mt-2.5 flex h-6 items-end gap-0.5"
          >
            {BAR_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-brand/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Next up</p>
        <ul className="space-y-2.5">
          {MOCK_NOW_PLAYING.nextUp.map((track) => (
            <li key={track.title} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Music2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {track.duration}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 gap-1.5")}
        >
          Change content
        </button>
        <button
          type="button"
          aria-label="More options"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}
