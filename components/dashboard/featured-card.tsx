import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import type { Room } from "@/lib/data";

/**
 * Large featured card — uppercase label + title + subtitle above a wide
 * landscape image with a caption, mirroring Apple Music's "New" hero row.
 */
export function FeaturedCard({
  room,
  label,
  blurb,
}: {
  room: Room;
  label: string;
  blurb: string;
}) {
  return (
    <a href="#" className="group block">
      <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <h3 className="mt-1.5 truncate text-lg font-semibold tracking-tight text-foreground">
        {room.name}
      </h3>
      <p className="truncate text-sm text-muted-foreground">{room.genre}</p>

      <div className="relative mt-3 overflow-hidden rounded-2xl">
        <Cover
          title={room.name}
          src={room.coverSrc}
          sizes="(max-width: 1024px) 90vw, 420px"
          className="aspect-[16/10] rounded-2xl transition duration-300 group-hover:scale-[1.01]"
        />
        {/* caption scrim for legibility over the image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3.5 pt-12 pr-14">
          <p className="line-clamp-2 text-xs leading-snug text-white/90">
            {blurb}
          </p>
        </div>
        <span className="absolute right-3 bottom-3 grid size-10 translate-y-1 place-items-center rounded-full bg-brand text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="size-4 fill-current" />
        </span>
      </div>
    </a>
  );
}
