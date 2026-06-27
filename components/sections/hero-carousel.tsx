"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { heroSlides } from "@/lib/data";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const INTERVAL = 5000;

/** Rotating hero message: 3 slides, auto-advancing, pause on hover/focus. */
export function HeroCarousel() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % heroSlides.length),
      INTERVAL,
    );
    return () => clearInterval(id);
  }, [reduced, paused]);

  const slide = heroSlides[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative min-h-[15rem] sm:min-h-[16rem] lg:min-h-[19rem]">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-display text-5xl font-semibold sm:text-6xl lg:text-[5rem]">
              <span className="block">{slide.line1}</span>
              <span className="block">
                {slide.line2}
                <span className="text-brand">.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75 sm:text-xl">
              {slide.sub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="mt-7 flex items-center gap-2.5"
        role="group"
        aria-label="Choose hero message"
      >
        {heroSlides.map((s, i) => (
          <button
            key={s.line2}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${s.line1} ${s.line2}`}
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
    </div>
  );
}
