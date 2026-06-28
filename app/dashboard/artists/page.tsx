import type { Metadata } from "next";

import { getArtists } from "@/lib/artists";
import { ArtistCard } from "@/components/artists/artist-card";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const artists = await getArtists(60);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Artists
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Everyone making noise across Tazama
        </p>
      </header>

      {artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No artists yet — play some genres on Home and they’ll show up here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {artists.map((artist) => (
            <ArtistCard key={artist.slug} artist={artist} fill />
          ))}
        </div>
      )}
    </div>
  );
}
