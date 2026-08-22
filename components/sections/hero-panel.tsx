"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SectionIcon } from "@/components/section-icon";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { heroPanelCopy } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Right-side description card, synced to the same `index` as the headline
 * carousel — replaces the earlier static now-playing card with copy that
 * actually matches whichever slide is showing.
 */
export function HeroPanel({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const panel = heroPanelCopy[index];

  return (
    <div
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-surface p-7 text-white shadow-dark",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand">
            <SectionIcon name={panel.icon} className="size-5" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            {panel.title}
          </h2>
          <p className="mt-3 leading-relaxed text-white/70">{panel.body}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
