import { ChevronRight } from "lucide-react";

import { RoomTile } from "./room-tile";
import type { Room } from "@/lib/data";

export function ContentRow({
  title,
  subtitle,
  rooms,
}: {
  title: string;
  subtitle?: string;
  rooms: Room[];
}) {
  return (
    <section className="space-y-3.5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <a
          href="#"
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
          <ChevronRight className="size-4" />
        </a>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-2">
        {rooms.map((room) => (
          <RoomTile key={room.id} room={room} />
        ))}
      </div>
    </section>
  );
}
