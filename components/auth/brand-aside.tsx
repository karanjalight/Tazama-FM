"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Equalizer } from "@/components/brand/equalizer";
import { AvatarStack } from "@/components/live/avatar-stack";
import { LiveBadge } from "@/components/live/live-badge";
import { members } from "@/lib/data";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

const PHRASES = [
  "Everyone hears the same song, at the same moment.",
  "Spin up a room. Share one link. Press play together.",
  "Real rooms, real people, perfectly in sync.",
];

/**
 * The dark brand panel shown beside every auth form on large screens.
 * Sets the tone: wordmark, a rotating value line, and a live "social proof"
 * card. Decorative — the form carries the actual task.
 */
export function BrandAside() {
  const reduce = usePrefersReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 4200);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex xl:p-12">
      {/* faint equalizer texture in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-8 -right-6 opacity-[0.06]"
      >
        <Equalizer
          bars={9}
          barClassName="w-3 bg-white"
          className="h-48 items-end gap-2"
        />
      </div>

      {/* wordmark */}
      <Image
        src="/brand/logo.png"
        alt="Tazama"
        width={1200}
        height={1200}
        className="h-9 lg:h-40 w-auto object-contain brightness-0 invert"
        priority
      />

      {/* rotating value line */}
      <div className="relative z-10 max-w-sm">
        <p className="mb-4 font-mono text-xs tracking-widest text-white/40 uppercase">
          Listen together
        </p>
        <div className="min-h-[4.5em] sm:min-h-[3.5em]">
          <AnimatePresence mode="wait">
            <motion.h2
              key={i}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-2xl leading-tight font-semibold tracking-tight text-balance xl:text-3xl"
            >
              {PHRASES[i]}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>

      {/* live social proof */}
      <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
          <Equalizer bars={4} className="h-4" barClassName="w-1" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="font-mono text-xs text-white/45">
              2,480 listening now
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-white/70">
            Friday Night Amapiano · Afrobeats Heat · Late Night Jazz
          </p>
        </div>
        <AvatarStack
          members={members.slice(0, 4)}
          size="sm"
          ringClassName="ring-ink"
        />
      </div>
    </aside>
  );
}
