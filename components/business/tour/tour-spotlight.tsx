"use client";

import { motion } from "framer-motion";

import type { TargetLayout } from "./use-target-rect";

const PAD = 6;

/**
 * Dims the page with one huge box-shadow around a padded box over the target.
 * With no target the box collapses to the centre, so the whole page stays dim
 * and the box glides between steps instead of popping.
 */
export function TourSpotlight({
  layout,
  reducedMotion,
  visible,
}: {
  layout: TargetLayout;
  reducedMotion: boolean;
  visible: boolean;
}) {
  const { rect, viewport } = layout;
  const box = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 };

  return (
    <motion.div
      aria-hidden
      data-tour-spotlight={rect ? "target" : "none"}
      className="pointer-events-none fixed z-[60] rounded-2xl"
      style={{ boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0.58)" }}
      initial={{ ...box, opacity: 0 }}
      animate={{ ...box, opacity: visible ? 1 : 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34, opacity: { duration: 0.2 } }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-brand"
        initial={false}
        animate={{ opacity: rect ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      />
    </motion.div>
  );
}
