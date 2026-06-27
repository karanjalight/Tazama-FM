import Link from "next/link";
import { Radio, Users } from "lucide-react";

import { Cover } from "@/components/cover";
import { roomGenreLabel } from "@/lib/room-genres";
import { cn, formatCount } from "@/lib/utils";
import type { RoomSummary } from "@/lib/rooms/types";

/** Dashboard tile for a real room. Links into the live room experience. */
export function RoomSummaryCard({
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
      className={cn("group block w-40 shrink-0 sm:w-44", className)}
    >
      <div className="relative">
        <Cover
          title={room.name}
          src={room.nowPlaying?.thumbnailUrl ?? undefined}
          sizes="176px"
          className="shadow-soft transition duration-300 group-hover:shadow-lift"
        />
        {room.isLive && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            <Radio className="size-3" />
            Live
          </span>
        )}
      </div>
      <h3 className="mt-2.5 truncate text-sm font-semibold text-foreground">
        {room.name}
      </h3>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3" />
        <span className="font-mono">{formatCount(room.listenerCount)}</span> in the room
      </p>
    </Link>
  );
}
