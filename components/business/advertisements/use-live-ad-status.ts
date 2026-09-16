"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { fetchLiveAdStatus } from "@/app/business/advertisements/actions";
import type { LiveAdStatus } from "@/lib/business/ad-analytics";

export const LIVE_POLL_MS = 10_000;

/** Server-rendered live status, refreshed every ~10s while the tab is visible
 * — drives the On Air strip and the live "plays today" counters. */
export function useLiveAdStatus(initial: LiveAdStatus): LiveAdStatus {
  const [status, setStatus] = React.useState(initial);

  React.useEffect(() => {
    if (!initial.schemaReady) return;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const next = await fetchLiveAdStatus();
        if (!cancelled && next) setStatus(next);
      } catch {
        // Transient — the next poll retries.
      }
    };
    const id = window.setInterval(refresh, LIVE_POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initial.schemaReady]);

  return status;
}

/** Wall-clock that ticks while `active` — for countdowns. */
export function useNow(active: boolean, intervalMs = 1000): number | null {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    if (!active) return () => window.clearTimeout(first);
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [active, intervalMs]);
  return now;
}

/** Once new plays land, re-render the server totals — at most once a minute,
 * so a busy network doesn't recompute the whole page on every poll. */
export function useRefreshOnNewPlays(totalPlaysToday: number, minIntervalMs = 60_000): void {
  const router = useRouter();
  const seen = React.useRef(totalPlaysToday);
  const lastRefresh = React.useRef(0);
  React.useEffect(() => {
    if (totalPlaysToday === seen.current) return;
    const refresh = () => {
      seen.current = totalPlaysToday;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    const wait = lastRefresh.current + minIntervalMs - Date.now();
    if (wait <= 0) {
      refresh();
      return;
    }
    const id = window.setTimeout(refresh, wait);
    return () => window.clearTimeout(id);
  }, [totalPlaysToday, minIntervalMs, router]);
}
