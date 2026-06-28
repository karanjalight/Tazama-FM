import Link from "next/link";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { Artist } from "@/lib/artists";

/** Circular artist tile (Spotify cue). `fill` makes it stretch in a grid cell. */
export function ArtistCard({
  artist,
  fill,
}: {
  artist: Artist;
  fill?: boolean;
}) {
  return (
    <Link
      href={`/dashboard/artists/${artist.slug}`}
      className={cn(
        "group block rounded-2xl p-3 text-center transition-colors hover:bg-muted/60",
        fill ? "w-full" : "w-36 shrink-0 sm:w-40",
      )}
    >
      <Cover
        title={artist.name}
        src={artist.image ?? undefined}
        sizes="160px"
        className="mb-3 rounded-full shadow-soft transition-shadow group-hover:shadow-lift"
      />
      <p className="truncate text-sm font-semibold text-foreground">
        {artist.name}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Artist</p>
    </Link>
  );
}
