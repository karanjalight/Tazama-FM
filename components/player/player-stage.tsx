"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { usePlayer } from "./player-provider";
import { FullscreenPlayer } from "./fullscreen-player";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Hosts the single, persistent YouTube iframe and the fullscreen surface.
 *
 * The iframe (`hostRef`) is mounted once and never reparented — moving an iframe
 * in the DOM reloads it. Instead the stage is always `fixed inset-0`: collapsed
 * it's transparent and non-interactive (audio only), expanded it fades in and —
 * in video mode — reveals the very same iframe at full size. The chrome rides an
 * `AnimatePresence` so collapsing fades out smoothly.
 */
export function PlayerStage({
  hostRef,
  stageRootRef,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  stageRootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { isExpanded } = usePlayer();
  const reduced = usePrefersReducedMotion();

  // Lock background scroll while the fullscreen view is open.
  React.useEffect(() => {
    if (!isExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isExpanded]);

  return (
    <motion.div
      ref={stageRootRef}
      aria-hidden={!isExpanded}
      initial={false}
      animate={{ opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
      className={cn(
        "fixed inset-0 z-50 bg-black",
        isExpanded ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* The single video surface — audio always, visible only in video mode. */}
      <div ref={hostRef} className="yt-stage-host absolute inset-0 h-full w-full" />

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="chrome"
            className="absolute inset-0"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
          >
            <FullscreenPlayer stageRef={stageRootRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
