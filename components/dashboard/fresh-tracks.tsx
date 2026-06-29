"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { TrackCard } from "@/components/dashboard/track-card";
import type { Track } from "@/lib/tracks";

const BATCH = 16;
const NEW_BADGE_COUNT = 6;

/**
 * "New on Tazama" grid. Renders the newest tracks and reveals 16 more per click —
 * instantly from the pre-loaded pool, then paging `/api/tracks/discover` once the
 * pool runs out. Each card plays into the currently-shown set as its queue.
 */
export function FreshTracks({ initial }: { initial: Track[] }) {
  const [extra, setExtra] = React.useState<Track[]>([]);
  const [visible, setVisible] = React.useState(Math.min(BATCH, initial.length));
  const [loading, setLoading] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);

  const combined = React.useMemo(() => [...initial, ...extra], [initial, extra]);
  const shown = combined.slice(0, visible);
  const hasMore = visible < combined.length || !exhausted;

  async function loadMore() {
    const target = visible + BATCH;
    if (target <= combined.length) {
      setVisible(target);
      return;
    }
    if (loading || exhausted) {
      setVisible(Math.min(target, combined.length));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tracks/discover?offset=${combined.length}&limit=${BATCH}`,
      );
      const data = (await res.json()) as { tracks?: Track[] };
      const seen = new Set(combined.map((t) => t.youtubeId));
      const fresh = (data.tracks ?? []).filter((t) => !seen.has(t.youtubeId));
      if (fresh.length < BATCH) setExhausted(true);
      setExtra((prev) => [...prev, ...fresh]);
      setVisible((v) => v + BATCH);
    } catch {
      setExhausted(true);
    } finally {
      setLoading(false);
    }
  }

  if (initial.length === 0) return null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          New on Tazama
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Fresh drops, straight off the catalog
        </p>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((track, i) => (
          <Reveal key={track.id} delay={(i % BATCH) * 0.035}>
            <TrackCard
              track={track}
              queue={shown}
              fill
              badge={
                i < NEW_BADGE_COUNT ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
                    New
                  </span>
                ) : undefined
              }
            />
          </Reveal>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60 disabled:hover:translate-y-0 dark:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </>
            ) : (
              "View more"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
