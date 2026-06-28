import Link from "next/link";
import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import type { PlaylistMeta } from "@/lib/artists";

/** A playlist tile that opens the playlist page (with a green play affordance). */
export function PlaylistCard({ playlist }: { playlist: PlaylistMeta }) {
  return (
    <Link
      href={`/dashboard/playlists/${playlist.id}`}
      className="group block w-44 shrink-0 rounded-2xl bg-card p-3 shadow-soft transition-colors hover:bg-muted/60 sm:w-48"
    >
      <div className="relative mb-3">
        <Cover
          title={playlist.title}
          src={playlist.cover ?? undefined}
          sizes="190px"
          className="rounded-xl shadow-soft"
        />
        <span className="absolute right-2 bottom-2 grid size-11 translate-y-1 place-items-center rounded-full bg-play text-black opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="size-5 translate-x-px fill-current" />
        </span>
      </div>
      <p className="truncate text-sm font-semibold text-foreground">
        {playlist.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
        {playlist.subtitle}
      </p>
    </Link>
  );
}
