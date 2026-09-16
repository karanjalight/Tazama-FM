"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade + rise on scroll, but server-rendered visible. motion/Reveal ships
 * `opacity:0` in the HTML, so headings stay blank until hydration finishes —
 * seconds on a phone, and forever for anything scrolled past before then.
 * This only hides content that is still below the fold once hydrated.
 */
export function RevealBelowFold({
  children,
  className,
  y = 20,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight) setArmed(true);
  }, []);

  const hidden = armed && !inView && !reduced;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={hidden ? { opacity: 0, y } : { opacity: 1, y: 0 }}
      transition={hidden ? { duration: 0 } : { duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
