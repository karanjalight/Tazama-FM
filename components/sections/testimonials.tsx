"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { testimonials } from "@/lib/data";
import { cn } from "@/lib/utils";

const INTERVAL = 6000;

export function Testimonials() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(id);
  }, [reduced, paused, count]);

  if (count === 0) return null;

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);
  const t = testimonials[index];
  const initials = t.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <section className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why businesses love Tazama
          </h2>
        </Reveal>

        <div
          className="relative mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <Quote
            aria-hidden="true"
            className="mx-auto size-9 text-muted-foreground/30"
          />

          <div className="relative mt-4 min-h-56 sm:min-h-44">
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={index}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{
                  duration: reduced ? 0 : 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-x-0 top-0 text-center"
              >
                <blockquote className="text-display text-xl leading-snug font-medium text-foreground sm:text-2xl">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex flex-col items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
                    {initials}
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">
                      {t.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t.title}, {t.company}
                    </span>
                  </span>
                  {t.href ? (
                    <a
                      href={t.href}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
                    >
                      Read case study
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {count > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="inline-grid size-10 place-items-center rounded-full border border-border text-foreground transition hover:bg-muted"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <div
                className="flex items-center gap-2"
                role="group"
                aria-label="Choose testimonial"
              >
                {testimonials.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Testimonial from ${s.name}`}
                    aria-current={i === index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === index
                        ? "w-6 bg-foreground"
                        : "w-1.5 bg-border hover:bg-foreground/40",
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className="inline-grid size-10 place-items-center rounded-full border border-border text-foreground transition hover:bg-muted"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
