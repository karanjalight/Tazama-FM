"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * A single word that flips in (3D rotateX) whenever `children` changes,
 * animating its own width along with it so short and long words don't jump
 * the surrounding line.
 */
export function FlipWord({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.span
      layout
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative inline-block align-top [perspective:1400px]",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={children}
          className="inline-block whitespace-nowrap"
          style={{ transformOrigin: "50% 50%" }}
          initial={reduced ? false : { rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
