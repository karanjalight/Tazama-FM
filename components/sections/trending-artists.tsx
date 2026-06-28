import { Mic2 } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { TrendingArtistCard } from "@/components/landing/trending-artist-card";
import type { TrendingArtist } from "@/lib/tracks";

/** "Trending artists" — real artists from the catalog, each track playable. */
export function TrendingArtists({ artists }: { artists: TrendingArtist[] }) {
  if (artists.length === 0) return null;

  return (
    <section
      id="artists"
      className="scroll-mt-20 bg-bg-alt py-16 sm:py-20 dark:bg-white/[0.02]"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
            <Mic2 className="size-3.5" />
            Trending artists
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground dark:text-white sm:text-4xl">
            The artists everyone’s playing
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Tap any artist to hear what’s moving the rooms right now.
          </p>
        </Reveal>

        <Reveal className="mt-8">
          <div className="no-scrollbar -mx-1 flex gap-5 overflow-x-auto px-1 pt-1 pb-3">
            {artists.map((artist) => (
              <TrendingArtistCard key={artist.name} artist={artist} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
