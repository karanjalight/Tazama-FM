"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { Container, Kicker } from "./kit/primitives";

const LINES = [
  "Music plays from a phone behind the counter.",
  "Menus live on a USB stick.",
  "Promotions get printed and taped to the wall.",
  "Announcements get shouted over the noise.",
  "And every location does it differently.",
];

/**
 * The problem, told as one paragraph that lights up sentence by sentence as
 * it scrolls through the viewport — then resolves into the answer.
 */
export function Problem() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });

  return (
    <section aria-labelledby="problem-heading" className="relative bg-ink py-24 text-white sm:py-32 lg:py-40">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <Kicker index="01" className="lg:pt-4">
            The problem
          </Kicker>
          <div>
            <h2 id="problem-heading" className="sr-only">
              Why businesses need one platform
            </h2>
            <div ref={ref}>
              <p className="font-display text-[30px] leading-[1.18] font-medium tracking-[-0.03em] sm:text-[42px] lg:text-[52px]">
                {LINES.map((line, i) => (
                  <Line key={line} progress={scrollYProgress} index={i} reduced={reduced}>
                    {line}{" "}
                  </Line>
                ))}
              </p>
            </div>
            <div className="mt-14 flex flex-col gap-6 border-t border-white/[0.08] pt-10 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-2xl font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[40px]">
                Tazama brings all of it into one platform<span className="text-brand">.</span>
              </p>
              <p className="max-w-xs text-[15px] leading-relaxed text-zinc-400">
                One place to run what plays, what shows and what customers hear — in every location.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Line({
  progress,
  index,
  reduced,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const start = index / LINES.length;
  const end = (index + 1) / LINES.length;
  const opacity = useTransform(progress, [start, end], [0.16, 1]);
  return (
    <motion.span style={{ opacity: reduced ? 1 : opacity }} className="transition-none">
      {children}
    </motion.span>
  );
}
