import Link from "next/link";
import { Radio, Users } from "lucide-react";

import { Cover } from "@/components/cover";
import { roomGenreLabel } from "@/lib/room-genres";
import { cn, formatCount } from "@/lib/utils";
import type { RoomSummary } from "@/lib/rooms/types";

/** A real public room on the landing page. Links into the room (sign in to join). */
export function LiveRoomCard({
  room,
  className,
}: {
  room: RoomSummary;
  className?: string;
}) {
  const subtitle =
    room.nowPlaying?.title ||
    (room.genres.length ? roomGenreLabel(room.genres[0]) : "Hangout");

  return (
    <Link
      href={`/rooms/${room.slug}`}
      aria-label={`${room.name} — hosted by ${room.hostName}`}
      className={cn(
        "group block w-65 shrink-0 rounded-2xl border border-border bg-card p-3 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:w-70 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:border-white/20",
        className,
      )}
    >
      <div className="relative">
        <Cover
          title={room.name}
          src={room.nowPlaying?.thumbnailUrl ?? undefined}
          sizes="280px"
          className="transition duration-300 group-hover:scale-[1.01]"
        />
        {room.isLive && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            <Radio className="size-3" />
            Live
          </span>
        )}
      </div>
      <div className="px-1 pt-3">
        <h3 className="truncate leading-tight font-semibold text-foreground dark:text-white">
          {room.name}
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          <span className="font-mono text-foreground dark:text-white">
            {formatCount(room.listenerCount)}
          </span>
          in the room · {room.hostName}
        </div>
      </div>
    </Link>
  );
}
