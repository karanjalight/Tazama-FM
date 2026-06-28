import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getArtists } from "@/lib/artists";
import { ArtistCard } from "@/components/artists/artist-card";

/** "Popular artists" strip for the dashboard home. */
export async function ArtistsRow() {
  const artists = await getArtists(12);
  if (artists.length === 0) return null;

  return (
    <section className="space-y-3.5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Popular artists
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The voices behind the sounds on Tazama
          </p>
        </div>
        <Link
          href="/dashboard/artists"
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {artists.map((artist) => (
          <ArtistCard key={artist.slug} artist={artist} />
        ))}
      </div>
    </section>
  );
}
