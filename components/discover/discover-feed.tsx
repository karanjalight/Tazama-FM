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
 * what lets the single shared YouTube iframe (fixed over the whole viewport,
 * one z-index below this feed) stand in as "this card's video" without ever
 * being reparented. This root has no opaque background of its own — only the
 * trailing end-of-feed section (which has no video underneath it) paints
 * black — so the settled card's `isActive` gate can let the shared iframe's
 * video actually show through instead of being hidden behind a poster.
 */
export function DiscoverFeed({ playlists }: { playlists: DiscoveryPlaylist[] }) {
  const router = useRouter();
  const { enterPreview, exitPreview, previewTrack, commitPreview } = usePlayer();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const settledRef = React.useRef(-1);
  const timerRef = React.useRef<number | null>(null);
  // Which card is currently settled — drives DiscoverCard's `isActive` prop
  // (React state, not just the ref above, since a card needs to re-render to
  // hide its poster once it becomes the active/previewing one).
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    enterPreview();
    return () => {
      // Reset so a StrictMode dev double-invoke (mount → cleanup → mount)
      // doesn't leave settledRef pointing at an index it never actually
      // re-previews: without this, the second mount's previewAt(0) call sees
      // settledRef.current already === 0 (set by the first, since-torn-down
      // pass) and no-ops, so card 0 silently never gets its preview armed.
      settledRef.current = -1;
      exitPreview();
    };
  }, [enterPreview, exitPreview]);

  const previewAt = React.useCallback(
    (index: number) => {
      if (settledRef.current === index) return;
      settledRef.current = index;
      setActiveIndex(index);
      const playlist = playlists[index];
      if (!playlist) return; // the trailing end-of-feed card has nothing to preview
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
    // reload to position 0) the track just committed. This synchronous
    // cancellation is the whole fix: it runs in the same tick as the tap,
    // strictly before the timer could ever fire, so there's no remaining
    // window for a stale settle to land after a commit — previewAt no longer
    // needs (or has) a separate committed-track guard for this.
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

  function handleClose() {
    // router.back() dead-ends when /dashboard/discover was opened as the
    // first entry in the session's history (deep link, shared link, PWA
    // shortcut) — MobileBottomNav is hidden on this route, so without this
    // fallback there'd be no in-app way out at all.
    //
    // The threshold is 2, not 1: every browsing context starts with an
    // implicit `about:blank` entry, so even a tab's very first real
    // navigation already reports `history.length === 2` — confirmed by
    // direct testing, a bare `> 1` check is always true and never actually
    // falls back, letting back() land on that blank entry instead. A true
    // deep link straight to this route (no prior in-app page) also measures
    // exactly 2; any further in-app navigation before landing here pushes
    // at least one more real entry, so `> 2` is the first threshold that
    // reliably tells the two apart.
    if (window.history.length > 2) router.back();
    else router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        onClick={handleClose}
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
        {playlists.map((playlist, index) => (
          <DiscoverCard
            key={playlist.id}
            playlist={playlist}
            isActive={index === activeIndex}
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
