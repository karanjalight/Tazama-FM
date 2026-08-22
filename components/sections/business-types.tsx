"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { businessTypes } from "@/lib/data";
import { cn } from "@/lib/utils";

const INTERVAL = 4500;
const GAP_REM = 1.25;

export function BusinessTypes() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = businessTypes.length;

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(id);
  }, [reduced, paused, count]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);

  return (
    <section className="scroll-mt-20 bg-section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal className="max-w-md">
            <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for every business type
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Tazama adapts to your environment, operations, and the way you
              engage customers — across any industry.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous business type"
              className="inline-grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-foreground/25 hover:bg-muted"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span
              className="font-mono text-sm text-muted-foreground tabular-nums"
              aria-live="polite"
            >
              <span className="text-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>{" "}
              / {String(count).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next business type"
              className="inline-grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-foreground/25 hover:bg-muted"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </Reveal>
        </div>

        <div
          className="-my-6 mt-12 overflow-hidden py-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Business types"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <motion.div
            className="flex [--card-w:78vw] sm:[--card-w:23rem] lg:[--card-w:25rem]"
            style={{ gap: `${GAP_REM}rem` }}
            animate={{
              x: `calc(-${index} * (var(--card-w) + ${GAP_REM}rem))`,
            }}
            transition={{
              duration: reduced ? 0 : 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {businessTypes.map((b, i) => {
              const isActive = i === index;
              return (
                <motion.div
                  key={b.title}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-current={isActive || undefined}
                  onClick={() => !isActive && setIndex(i)}
                  className={cn(
                    "w-(--card-w) shrink-0 overflow-hidden rounded-3xl border bg-card dark:shadow-none",
                    isActive
                      ? "z-10 cursor-default border-border shadow-lift"
                      : "cursor-pointer border-border/60 shadow-soft",
                  )}
                  animate={{
                    scale: reduced ? 1 : isActive ? 1.06 : 0.9,
                    opacity: isActive ? 1 : 0.7,
                  }}
                  transition={{
                    duration: reduced ? 0 : 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="relative aspect-4/3 overflow-hidden">
                    <Image
                      src={b.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25rem, (min-width: 640px) 23rem, 78vw"
                      className="object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 bg-background transition-opacity duration-500",
                        isActive ? "opacity-0" : "opacity-20",
                      )}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {b.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href={b.href}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
                    >
                      Learn more
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
