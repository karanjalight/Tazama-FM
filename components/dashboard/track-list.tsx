import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import type { DashTrack } from "@/lib/dashboard-data";

/** "Best New Songs"-style multi-column track list. */
export function TrackList({ tracks }: { tracks: DashTrack[] }) {
  return (
    <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tracks.map((t) => (
        <a
          key={t.id}
          href="#"
          className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
        >
          <div className="relative size-12 shrink-0">
            <Cover
              title={t.title}
              src={t.coverSrc}
              sizes="48px"
              className="rounded-md"
            />
            <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="size-4 fill-white text-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {t.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
