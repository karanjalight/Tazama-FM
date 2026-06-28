import { Flame } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { TrendingTrackCard } from "@/components/landing/trending-track-card";
import type { Track } from "@/lib/tracks";

/** "Trending now" — real, playable catalog tracks on the landing page. */
export function TrendingTracks({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) return null;

  return (
    <section id="trending" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
            <Flame className="size-3.5" />
            Trending now
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground dark:text-white sm:text-4xl">
            Hot right now on Tazama
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Press play — no account needed. Then start a room and listen with
            friends.
          </p>
        </Reveal>

        <Reveal className="mt-8">
          <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-3">
            {tracks.map((track) => (
              <TrendingTrackCard key={track.id} track={track} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
