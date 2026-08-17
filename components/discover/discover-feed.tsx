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
  const { enterPreview, exitPreview, previewTrack, commitPreview, currentTrack } = usePlayer();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const settledRef = React.useRef(-1);
  const timerRef = React.useRef<number | null>(null);
  // Mirrors currentTrack for previewAt to read live, instead of closing over
  // it — a setTimeout callback (handleScroll's debounce) captures whichever
  // previewAt/currentTrack bindings existed at the render where the timer was
  // armed, permanently. If a commit changes currentTrack before that stale
  // timer fires, the closure can never see it no matter how long it waits;
  // only a ref read at call time is guaranteed current.
  const currentTrackRef = React.useRef(currentTrack);
  React.useEffect(() => {
    currentTrackRef.current = currentTrack;
  });

  React.useEffect(() => {
    enterPreview();
    return () => exitPreview();
  }, [enterPreview, exitPreview]);

  const previewAt = React.useCallback(
    (index: number) => {
      if (settledRef.current === index) return;
      settledRef.current = index;
      const playlist = playlists[index];
      if (!playlist) return; // the trailing end-of-feed card has nothing to preview
      // A commit can land while this card's own settle debounce is still in
      // flight (swipe, then tap commit within SETTLE_MS) — don't let that
      // late timer re-preview (and re-mute) the card the user just committed.
      // Reads the live ref (see currentTrackRef above), not a closed-over
      // value, so this stays correct no matter how stale this particular
      // previewAt closure is by the time it actually runs.
      const committedTrack = currentTrackRef.current;
      if (committedTrack && playlist.tracks.some((t) => t.id === committedTrack.id)) return;
      // Re-arm preview mode before loading. enterPreview() is a no-op once
      // already previewing, so this only actually does anything right after a
      // commit — and by the time the user has scrolled to a new settled card
      // (hundreds of ms later, never in the same tick as commitPreview), the
      // snapshot it takes is genuinely fresh: the committed track's real
      // position/isPlaying/isMuted, not a stale pre-commit read. Until the
      // user swipes again, the committed track is left untouched and keeps
      // playing unmuted — closing the feed without swiping never re-enters
      // preview mode at all, so exitPreview() correctly no-ops instead of
      // pausing something that was never handed off to it.
      enterPreview();
      previewTrack(playlist.tracks);
    },
    [playlists, previewTrack, enterPreview],
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
    // Cancel any settle timer still in flight for the card being committed —
    // otherwise it can fire ~SETTLE_MS after this tap and re-preview (mute,
    // reload to position 0) the track just committed. Always safe: the user
    // can only commit the card they're currently on, which is exactly the
    // card any pending timer is resolving toward; the next scroll re-arms it.
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Deliberately doesn't re-enter preview mode here (see previewAt's
    // comment) — the committed track just plays, unmuted, until the user
    // actually swipes to browse something else.
    commitPreview(playlist.tracks);
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
