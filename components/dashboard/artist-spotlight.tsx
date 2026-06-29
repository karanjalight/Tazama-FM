"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Cover } from "@/components/cover";
import { PlayButton } from "@/components/artists/play-button";
import { TrackRow } from "@/components/artists/track-row";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { genreLabel } from "@/lib/genres";
import { cn, formatCount } from "@/lib/utils";
import type { ArtistSpotlight } from "@/lib/artists";

const EASE = [0.22, 1, 0.36, 1] as const;
const ROTATE_MS = 7000;

/**
 * The dashboard's "vibe" moment: a full-bleed, dark, auto-rotating spotlight
 * cycling through the catalog's biggest artists — blurred-cover backdrop, big
 * name, an editorial blurb, and their playable top tracks. Pauses on hover,
 * goes static under reduced-motion. Rendered as a `.dark` island so the shared
 * player components read correctly on the dark surface.
 */
export function ArtistSpotlightReel({ items }: { items: ArtistSpotlight[] }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const count = items.length;
  React.useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % count),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, paused, count]);

  if (count === 0) return null;
  const idx = Math.min(active, count - 1);
  const { artist, bio, tracks } = items[idx];
  const href = `/dashboard/artists/${artist.slug}`;
  const go = (n: number) => setActive((n + count) % count);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 text-brand" />
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          In the spotlight
        </h2>
      </header>

      <div
        className="dark relative overflow-hidden rounded-3xl bg-ink text-white shadow-dark"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {/* blurred backdrop (crossfades between artists) */}
        <div aria-hidden className="absolute inset-0">
          <AnimatePresence initial={false}>
            {artist.image && (
              <motion.div
                key={artist.slug}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: reduced ? 0.25 : 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.8, ease: EASE }}
              >
                <Image
                  src={artist.image}
                  alt=""
                  fill
                  sizes="100vw"
                  className="scale-110 object-cover blur-2xl"
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
        </div>

        {/* content — keyed enter-fade (no AnimatePresence, so the band never
            collapses height between artists) */}
        <div className="relative">
          <motion.div
            key={artist.slug}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_minmax(0,380px)] lg:items-center lg:gap-12 lg:p-12"
          >
            {/* left — the story */}
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-white/55 uppercase">
                Artist of the moment
              </p>
              <h3 className="text-display mt-2 line-clamp-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                {artist.name}
              </h3>
              <p className="mt-2 text-sm text-white/60">
                {artist.genres[0] ? genreLabel(artist.genres[0]) : "Artist"} ·{" "}
                <span className="font-mono">
                  {formatCount(artist.monthlyListeners)}
                </span>{" "}
                monthly listeners
              </p>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
                {bio}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <PlayButton tracks={tracks} size="lg" />
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Open profile
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* right — artwork + top tracks */}
            <div className="min-w-0">
              <Link href={href} className="group block">
                <Cover
                  title={artist.name}
                  src={artist.image ?? undefined}
                  sizes="380px"
                  priority
                  className="rounded-2xl shadow-2xl ring-1 ring-white/15 transition duration-500 group-hover:scale-[1.02]"
                />
              </Link>
              {tracks.length > 0 && (
                <div className="mt-4 space-y-0.5">
                  {tracks.slice(0, 4).map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i}
                      queue={tracks}
                      showCover={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* controls */}
        {count > 1 && (
          <>
            <div className="absolute top-5 right-5 z-10 flex gap-1.5">
              <button
                type="button"
                onClick={() => go(idx - 1)}
                aria-label="Previous artist"
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(idx + 1)}
                aria-label="Next artist"
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {items.map((s, i) => (
                <button
                  key={s.artist.slug}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show ${s.artist.name}`}
                  aria-current={i === idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === idx ? "w-6 bg-brand" : "w-1.5 bg-white/35 hover:bg-white/60",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
