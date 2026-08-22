"use client";

import { AnimatePresence, motion } from "framer-motion";
import { businessHeroSlides } from "@/lib/data";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { FlipWord } from "@/components/motion/flip-word";
import { cn } from "@/lib/utils";

/**
 * Rotating hero message. Shares its copy with the Business hero
 * (`businessHeroSlides` in lib/data.ts) so both pages read as the same
 * product. Controlled by the parent `Hero`, which owns the shared timer so
 * the headline and background stay in sync.
 */
export function HeroCarousel({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (index: number) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const slide = businessHeroSlides[index];

  return (
    <div>
      <div className="relative min-h-[12rem] sm:min-h-[15rem] lg:min-h-[19.5rem]">
        <AnimatePresence initial={false}>
          <motion.h1
            key={index}
            className="text-display absolute inset-x-0 top-0 text-5xl font-semibold sm:text-6xl lg:text-[5rem]"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
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

      <div
        className="mt-6 flex items-center gap-2.5"
        role="group"
        aria-label="Choose hero message"
      >
        {businessHeroSlides.map((s, i) => (
          <button
            key={`${s.motif}-${i}`}
            type="button"
            onClick={() => onSelect(i)}
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
    </div>
  );
}
