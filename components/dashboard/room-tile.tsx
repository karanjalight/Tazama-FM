import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn, formatCount } from "@/lib/utils";
import type { Room } from "@/lib/data";

/** Apple-Music-style album tile for the dashboard's horizontal rows. */
export function RoomTile({ room, className }: { room: Room; className?: string }) {
  return (
    <a
      href="#"
      aria-label={`${room.name} — ${room.genre}, ${formatCount(room.listeners)} listening`}
      className={cn("group block w-40 shrink-0 sm:w-44", className)}
    >
      <div className="relative">
        <Cover
          title={room.name}
          src={room.coverSrc}
          sizes="176px"
          className="shadow-soft transition duration-300 group-hover:shadow-lift"
        />
        <span className="absolute right-2 bottom-2 grid size-9 translate-y-1 place-items-center rounded-full bg-brand text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="size-4 fill-current" />
        </span>
      </div>
      <h3 className="mt-2.5 truncate text-sm font-semibold text-foreground">
        {room.name}
      </h3>
      <p className="truncate text-xs text-muted-foreground">{room.genre}</p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden />
        <span className="font-mono">{formatCount(room.listeners)}</span> live
      </p>
    </a>
  );
}
