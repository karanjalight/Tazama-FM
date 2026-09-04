import Link from "next/link";
import { Music2 } from "lucide-react";

import type { RoomTrack } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface DashboardNowPlayingEntry {
  branchId: string;
  branchName: string;
  track: RoomTrack | null;
  isPlaying: boolean;
}

const BAR_HEIGHTS = [40, 70, 30, 90, 55, 75, 35, 60, 45, 85, 50, 65, 30, 95, 40];

export function NowPlayingPanel({ entries }: { entries: DashboardNowPlayingEntry[] }) {
  const playing = entries.filter(
    (e): e is DashboardNowPlayingEntry & { track: RoomTrack } => e.isPlaying && e.track !== null,
  );
  const [hero, ...rest] = playing;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Now Playing Across Locations</h2>
        <Link
          href="/business/branches"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View all
        </Link>
      </div>

      {hero ? (
        <>
          <div className="mt-4 flex gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-linear-to-br from-rose-500/25 to-amber-500/25 text-foreground">
              <Music2 className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{hero.track.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {hero.track.artist ?? "Unknown artist"} · {hero.branchName}
              </p>
              <div aria-hidden="true" className="mt-2.5 flex h-6 items-end gap-0.5">
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

          {rest.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Also playing</p>
              <ul className="space-y-2.5">
                {rest.map((entry) => (
                  <li key={entry.branchId} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Music2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.track.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.track.artist ?? "Unknown artist"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entry.branchName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
          <Music2 className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing playing across your locations right now.
          </p>
        </div>
      )}
    </div>
  );
}
