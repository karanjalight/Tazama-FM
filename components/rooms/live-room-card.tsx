import Link from "next/link";
import { Users } from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { roomGenreLabel } from "@/lib/room-genres";
import { cn, formatCount } from "@/lib/utils";
import type { RoomSummary } from "@/lib/rooms/types";

/**
 * Big, editorial live-room tile for the dashboard "Live now" strip. Large
 * now-playing artwork with a pulsing LIVE badge, listener count, the current
 * track, host, and genre chips. Links into the live room.
 */
export function LiveRoomCard({
  room,
  className,
}: {
  room: RoomSummary;
  className?: string;
}) {
  const np = room.nowPlaying;

  return (
    <Link
      href={`/rooms/${room.slug}`}
      aria-label={`${room.name} — live, hosted by ${room.hostName}`}
      className={cn(
        "group relative block w-72 shrink-0 overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:w-80 dark:shadow-none dark:hover:border-white/20",
        className,
      )}
    >
      {/* artwork */}
      <div className="relative overflow-hidden">
        <Cover
          title={room.name}
          src={np?.thumbnailUrl ?? undefined}
          sizes="320px"
          className="aspect-[16/10] rounded-none transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

        {/* live badge */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase shadow-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-white/80" />
            <span className="relative inline-flex size-1.5 rounded-full bg-white" />
          </span>
          Live
        </span>

        {/* listeners */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Users className="size-3.5" />
          <span className="font-mono">{formatCount(room.listenerCount)}</span>
        </span>

        {/* now playing */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-3.5 text-white">
          <Equalizer bars={4} className="h-4 shrink-0" barClassName="bg-white" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {np?.title ?? "Live hangout"}
            </span>
            {np?.artist && (
              <span className="block truncate text-xs text-white/75">
                {np.artist}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* meta */}
      <div className="p-4">
        <h3 className="truncate text-base font-semibold text-foreground">
          {room.name}
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          host · {room.hostName}
        </p>
        {room.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {room.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {roomGenreLabel(g)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
