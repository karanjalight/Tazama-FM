import type { Metadata } from "next";

import { getArtistsDiscovery } from "@/lib/artists";
import { ArtistSpotlightCard } from "@/components/artists/artist-spotlight";
import { ArtistCard } from "@/components/artists/artist-card";

export const metadata: Metadata = { title: "Artists" };

// Re-roll the spotlight + roster on every load — discovery is the point.
export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const { spotlight, roster } = await getArtistsDiscovery(36);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Discover
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Artists
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          A fresh spotlight every time you land here — meet someone new and dig
          into their best.
        </p>
      </header>

      {spotlight && <ArtistSpotlightCard spotlight={spotlight} />}

      {roster.length > 0 ? (
        <section className="space-y-3.5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Artists to discover
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Reload for a whole new lineup
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {roster.map((artist) => (
              <ArtistCard key={artist.slug} artist={artist} fill />
            ))}
          </div>
        </section>
      ) : (
        !spotlight && (
          <p className="text-sm text-muted-foreground">
            No artists yet — play some genres on Home and they’ll show up here.
          </p>
        )
      )}
    </div>
  );
}
