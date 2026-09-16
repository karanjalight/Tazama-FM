"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

/** After a manual pick, how long autoplay waits before it takes over again. */
const RESUME_AFTER_MS = 12000;

/**
 * Drives a looping demo: advances `index` every `interval` ms, but only while
 * the attached element is on screen and the visitor hasn't asked for reduced
 * motion. `select(i)` jumps to a step and hands control to the visitor for a
 * while, so clicking never fights the timer.
 */
export function useCycle<T extends HTMLElement = HTMLDivElement>({
  count,
  interval,
  amount = 0.3,
}: {
  count: number;
  interval: number;
  amount?: number;
}) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [manualAt, setManualAt] = useState<number | null>(null);

  const running = inView && !reduced && manualAt === null;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [running, count, interval]);

  useEffect(() => {
    if (manualAt === null) return;
    const id = window.setTimeout(() => setManualAt(null), RESUME_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [manualAt]);

  const select = useCallback((i: number) => {
    setIndex(i);
    setManualAt(Date.now());
  }, []);

  return { ref, index, select, inView, reduced, running };
}

/**
 * A monotonically increasing counter that ticks every `interval` ms while the
 * element is on screen — for logs, counters and multi-target sequences.
 */
export function useTick<T extends HTMLElement = HTMLDivElement>({
  interval,
  amount = 0.25,
}: {
  interval: number;
  amount?: number;
}) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const running = inView && !reduced;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), interval);
    return () => window.clearInterval(id);
  }, [running, interval]);

  return { ref, tick, inView, reduced, running };
}
