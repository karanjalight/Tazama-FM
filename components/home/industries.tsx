"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { INDUSTRIES } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { ScreenFrame } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { ScreenContent } from "./kit/signage";
import { useCycle } from "./kit/use-cycle";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Industries() {
  const { ref, index, select, reduced } = useCycle<HTMLDivElement>({ count: INDUSTRIES.length, interval: 6500, amount: 0.45 });
  const industry = INDUSTRIES[index];

  // Nav links point at #industries-<id>: open that tab when the hash matches.
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.replace("#industries-", "");
      const i = INDUSTRIES.findIndex((ind) => ind.id === id);
      if (i >= 0) select(i);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [select]);

  return (
    <Section id="industries" tone="light">
      {/* Scroll targets for the nav's per-industry links */}
      {INDUSTRIES.map((ind) => (
        <span key={ind.id} id={`industries-${ind.id}`} aria-hidden className="absolute top-0 scroll-mt-16" />
      ))}
      <Container wide>
        <SectionIntro
          index="06"
          kicker="Industries"
          tone="light"
          title={
            <>
              Built for businesses where customers <span className="text-zinc-400">see, hear and interact.</span>
            </>
          }
        />

        <div ref={ref} className="mt-12 sm:mt-16">
          <div
            role="tablist"
            aria-label="Industries"
            className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0"
          >
            {INDUSTRIES.map((ind, i) => (
              <button
                key={ind.id}
                role="tab"
                type="button"
                id={`industry-tab-${ind.id}`}
                aria-selected={index === i}
                aria-controls="industry-panel"
                onClick={() => select(i)}
                className={cn(
                  "relative shrink-0 px-3 py-3 text-[15px] whitespace-nowrap transition-colors sm:px-4",
                  index === i ? "text-ink" : "text-zinc-400 hover:text-zinc-700",
                )}
              >
                {ind.label}
                {index === i ? (
                  <motion.span
                    layoutId="industry-underline"
                    className="absolute inset-x-3 bottom-0 h-[2px] bg-ink sm:inset-x-4"
                    transition={{ duration: 0.4, ease: EASE }}
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div
            id="industry-panel"
            role="tabpanel"
            aria-labelledby={`industry-tab-${industry.id}`}
            className="relative mt-4 aspect-[9/15.5] overflow-hidden rounded-[24px] bg-ink text-white sm:aspect-[16/10] lg:aspect-[16/8] lg:rounded-[28px]"
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={industry.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.8, ease: EASE }}
              >
                <picture className="absolute inset-0 block">
                  <source media="(min-width: 640px)" srcSet={industry.image} />
                  <Image
                    src={industry.imageSm}
                    alt=""
                    fill
                    sizes="100vw"
                    className="scale-[1.02] object-cover"
                    priority={index === 0}
                  />
                </picture>
                <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/10 sm:bg-linear-to-r sm:from-black/85 sm:via-black/45 sm:to-black/5" />
              </motion.div>
            </AnimatePresence>

            {/* In-situ screen */}
            <div className="absolute inset-x-[7%] top-[7%] sm:inset-x-auto sm:top-1/2 sm:right-[5%] sm:w-[46%] sm:-translate-y-1/2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={industry.id}
                  initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <ScreenFrame>
                    <ScreenContent id={industry.screen} />
                  </ScreenFrame>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Story */}
            <div className="absolute inset-x-0 bottom-0 p-6 sm:top-0 sm:right-auto sm:flex sm:w-[46%] sm:flex-col sm:justify-end sm:p-10 lg:p-14">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={industry.id}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <p className="font-tech text-[11px] tracking-[0.12em] text-white/55 uppercase">{industry.label}</p>
                  <h3 className="mt-3 font-display text-[28px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[36px] lg:text-[44px]">
                    {industry.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-[16px]">{industry.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/15 pt-4 text-[13px] text-white/80 sm:mt-7">
                    {industry.uses.map((use) => (
                      <li key={use} className="flex items-center gap-2">
                        <span aria-hidden className="size-1 rounded-full bg-brand" />
                        {use}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
