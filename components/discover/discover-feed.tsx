"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";

import { usePlayer } from "@/components/player/player-provider";
import { settledIndex } from "@/lib/discover/scroll-math";
import { DiscoverCard } from "./discover-card";
import type { DiscoveryPlaylist } from "@/lib/discovery";

const SETTLE_MS = 350;

/**
 * Full-screen vertical snap feed over the app's curated mixes. Exactly one
 * card is ever fully in view at a time (h-dvh + snap-mandatory), which is
 * what lets the single shared YouTube iframe (fixed over the whole viewport)
 * stand in as "this card's video" without ever being reparented.
 */
export function DiscoverFeed({ playlists }: { playlists: DiscoveryPlaylist[] }) {
  const router = useRouter();
  const { enterPreview, exitPreview, previewTrack, commitPreview } = usePlayer();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const settledRef = React.useRef(-1);
  const timerRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    enterPreview();
    return () => {
      mountedRef.current = false;
      exitPreview();
    };
  }, [enterPreview, exitPreview]);

  const previewAt = React.useCallback(
    (index: number) => {
      if (settledRef.current === index) return;
      settledRef.current = index;
      const playlist = playlists[index];
      if (!playlist) return; // the trailing end-of-feed card has nothing to preview
      previewTrack(playlist.tracks);
    },
    [playlists, previewTrack],
  );

  React.useEffect(() => {
    previewAt(0); // the first card never fires a scroll event of its own
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handleScroll() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      previewAt(settledIndex(el.scrollTop, el.clientHeight, playlists.length));
    }, SETTLE_MS);
  }

  function handleCommit(playlist: DiscoveryPlaylist) {
    commitPreview(playlist.tracks);
    // PlayerProvider's `latest` ref mirror (which enterPreview snapshots from)
    // only catches up with commitPreview's state updates after this render
    // commits — calling enterPreview synchronously here would re-snapshot the
    // stale pre-commit track and mute state. Deferring a tick lets it settle
    // so the just-committed track is what gets restored on exitPreview.
    window.setTimeout(() => {
      if (mountedRef.current) enterPreview();
    }, 0);
  }

  function restart() {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Close discovery"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
      >
        <X className="size-5" />
      </button>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-scroll"
      >
        {playlists.map((playlist) => (
          <DiscoverCard
            key={playlist.id}
            playlist={playlist}
            onCommit={() => handleCommit(playlist)}
          />
        ))}

        <section className="flex h-dvh w-full snap-start snap-always flex-col items-center justify-center gap-4 bg-black text-center text-white">
          <p className="max-w-xs text-balance text-lg font-medium">
            You’ve hit today’s mixes
          </p>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm"
          >
            <RotateCcw className="size-4" />
            Start over
          </button>
        </section>
      </div>
    </div>
  );
}
