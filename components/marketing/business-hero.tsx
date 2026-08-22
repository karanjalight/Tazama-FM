"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { HeroBackdrop } from "@/components/brand/hero-backdrop";
import { FlipWord } from "@/components/motion/flip-word";
import { businessHeroSlides, businessHeroSubtitle } from "@/lib/data";
import { cn } from "@/lib/utils";

const INTERVAL = 5000;

/**
 * Business marketing hero: a 4-slide backdrop carousel paired with a
 * headline whose product word flips between Music / Digital Signage / TV.
 * Each slide's background is a decorative SVG/CSS motif by default — set
 * `image` on a slide in businessHeroSlides (lib/data.ts) to use a real photo
 * instead (see HeroBackdrop). Mirrors the consumer `HeroCarousel`'s
 * auto-advance/pause/reduced-motion behaviour so both heroes feel like the
 * same product.
 */
export function BusinessHero({ actions }: { actions?: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % businessHeroSlides.length),
      INTERVAL,
    );
    return () => clearInterval(id);
  }, [reduced, paused]);

  const slide = businessHeroSlides[index];

  return (
    <section
      className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-ink text-white lg:min-h-[88vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={reduced ? false : { opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: reduced ? 1 : 1.06 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: reduced ? 0 : 1.1, ease: "easeInOut" },
              scale: {
                duration: reduced ? 0 : INTERVAL / 1000 + 1.1,
                ease: "linear",
              },
            }}
          >
            <HeroBackdrop motif={slide.motif} image={slide.image} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-ink/70" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 py-28 sm:px-8 sm:py-32 lg:py-36">
        <p className="text-sm font-semibold tracking-wider text-white/45 uppercase">
          Tazama for Business
        </p>

        <div className="relative mt-4 min-h-[9rem] sm:min-h-[11rem] lg:min-h-[13.5rem]">
          <AnimatePresence initial={false}>
            <motion.h1
              key={index}
              className="text-display absolute inset-x-0 top-0 text-4xl font-semibold sm:text-5xl lg:text-6xl"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={{
                duration: reduced ? 0 : 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {slide.lead.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              {slide.word && (
                <span className="block">
                  <FlipWord className="text-brand">{slide.word}</FlipWord>
                </span>
              )}
              {slide.trail && <span className="block">{slide.trail}</span>}
            </motion.h1>
          </AnimatePresence>
        </div>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
          {businessHeroSubtitle}
        </p>

        <div
          className="mt-7 flex items-center gap-2.5"
          role="group"
          aria-label="Choose hero message"
        >
          {businessHeroSlides.map((s, i) => (
            <button
              key={`${s.motif}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={[...s.lead, s.word, s.trail].filter(Boolean).join(" ")}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-7 bg-brand"
                  : "w-2.5 bg-white/30 hover:bg-white/55",
              )}
            />
          ))}
        </div>

        {actions && (
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
