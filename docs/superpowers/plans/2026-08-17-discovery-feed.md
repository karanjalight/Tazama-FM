# TikTok-style Discovery Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose the mobile bottom nav's center "+" into a full-screen, vertically swipeable feed of the app's existing curated playlist mixes, with muted-video preview on settle and tap-to-commit playback — plus swap the bottom nav's "AI Chat" slot for "Library".

**Architecture:** No new content pipeline — the feed renders `getDiscovery().playlists` (already used by `/dashboard/browse`) as full-screen snap-scrolled cards. Because the app has exactly one persistent, never-reparented YouTube iframe, a new **preview mode** is added to `PlayerProvider` (snapshot → muted-load on settle → unmute-and-commit on tap → restore on exit) instead of spinning up per-card video elements. `PlayerStage` gets a new `isPreviewing` flag, separate from the existing `isExpanded` fullscreen mode, so the feed's own card chrome doesn't fight `FullscreenPlayer`'s transport controls.

**Tech Stack:** Next.js (App Router, this repo's patched build — see `FRONTEND/AGENTS.md`), React, TypeScript (`strict`), Tailwind, `lucide-react` icons, YouTube IFrame API via the existing `components/player/yt.ts` wrapper. No new dependencies.

## Global Constraints

- Never reparent the persistent YouTube iframe (`hostRef` in `player-provider.tsx`) — moving it in the DOM reloads it. All video display goes through the existing `PlayerStage`, never a new iframe/video element.
- `next build` and `next dev` both lock `.next` and cannot run together — validate with `npx tsc --noEmit` and `npx eslint <files>` instead of a live build, per this repo's established convention.
- No test runner is installed. Pure-logic files get a co-located `*.test.ts` using `node:test` + `node:assert/strict`, run via a standalone `tsc` compile to a temp dir (exact commands are in Task 1 — verified working against this repo's existing `lib/social/match-score.test.ts` before writing this plan). UI/hook code that depends on the live YouTube iframe is validated via `tsc`/`eslint` plus a manual dev-server pass (browser-dependent behavior isn't meaningfully unit-testable here — matches how the rest of `components/player/` is validated).
- Follow existing code style: no comments except where a non-obvious constraint needs explaining (this codebase's own files are a good model — see the header comments in `player-provider.tsx` and `player-stage.tsx`).
- Spec: `docs/superpowers/specs/2026-08-17-discovery-feed-design.md`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `lib/discover/scroll-math.ts` | Create | Pure `settledIndex()` — maps a scroll container's `scrollTop` to the settled card index. |
| `lib/discover/scroll-math.test.ts` | Create | Unit tests for `settledIndex()`. |
| `components/player/player-provider.tsx` | Modify | Add preview mode: `isPreviewing`, `enterPreview`, `previewTrack`, `commitPreview`, `exitPreview`. |
| `components/player/player-stage.tsx` | Modify | Show the video layer during `isPreviewing`, without triggering `FullscreenPlayer` chrome. |
| `app/dashboard/discover/page.tsx` | Create | Server component — fetches `getDiscovery()`, renders `DiscoverFeed` (or an empty state). |
| `components/discover/discover-card.tsx` | Create | One full-screen card: poster, title/subtitle, like button, tap-to-commit. |
| `components/discover/discover-feed.tsx` | Create | Scroll-snap container, settle detection, preview/commit wiring, end-of-feed card. |
| `components/dashboard/mobile-bottom-nav.tsx` | Modify | Swap `AI Chat` → `Library`; swap the FAB from `CreateRoomButton` to a `Compass` link into `/dashboard/discover`; hide the whole bar on `/dashboard/discover`. |
| `app/dashboard/layout.tsx` | Modify | Drop the now-unused `accountType`/`currentPlan`/`origin` props on `<MobileBottomNav>` (the fetches themselves stay — `Sidebar`/`MobileSidebar` still need them). |

---

### Task 1: Settle-index pure helper

**Files:**
- Create: `lib/discover/scroll-math.ts`
- Create: `lib/discover/scroll-math.test.ts`

**Interfaces:**
- Produces: `settledIndex(scrollTop: number, cardHeight: number, maxIndex: number): number` — used by Task 3's `DiscoverFeed` to decide which card (including the trailing end-of-feed card at index `playlists.length`) has settled after a scroll.

- [ ] **Step 1: Write the failing test**

Create `lib/discover/scroll-math.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { settledIndex } from "./scroll-math";

test("scrollTop of 0 settles on the first card", () => {
  assert.equal(settledIndex(0, 800, 5), 0);
});

test("scrollTop exactly on a card boundary settles on that card", () => {
  assert.equal(settledIndex(1600, 800, 5), 2);
});

test("scrollTop mid-drag rounds to the nearest card", () => {
  assert.equal(settledIndex(1150, 800, 5), 1); // 1150/800 = 1.4375 -> 1
  assert.equal(settledIndex(1450, 800, 5), 2); // 1450/800 = 1.8125 -> 2
});

test("clamps to maxIndex when scrollTop overshoots (elastic bounce)", () => {
  assert.equal(settledIndex(5000, 800, 5), 5);
});

test("clamps to 0 for a negative scrollTop (elastic bounce at the top)", () => {
  assert.equal(settledIndex(-40, 800, 5), 0);
});

test("returns 0 when cardHeight has not been measured yet", () => {
  assert.equal(settledIndex(500, 0, 5), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd FRONTEND
rm -rf /tmp/tz-scroll-math-test
npx tsc lib/discover/scroll-math.ts lib/discover/scroll-math.test.ts --outDir /tmp/tz-scroll-math-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck
```
Expected: tsc FAILS with `error TS2307: Cannot find module './scroll-math'` (or `TS6053: File 'lib/discover/scroll-math.ts' not found`) — the implementation file doesn't exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/discover/scroll-math.ts`:

```ts
/**
 * Maps a scroll container's `scrollTop` to the index of the fully-snapped
 * card, clamped to `[0, maxIndex]`. Used by the discovery feed to decide
 * which card has settled after the user stops scrolling.
 */
export function settledIndex(
  scrollTop: number,
  cardHeight: number,
  maxIndex: number,
): number {
  if (cardHeight <= 0 || maxIndex < 0) return 0;
  const raw = Math.round(scrollTop / cardHeight);
  return Math.min(Math.max(raw, 0), maxIndex);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd FRONTEND
rm -rf /tmp/tz-scroll-math-test
npx tsc lib/discover/scroll-math.ts lib/discover/scroll-math.test.ts --outDir /tmp/tz-scroll-math-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck
node --test /tmp/tz-scroll-math-test/
rm -rf /tmp/tz-scroll-math-test
```
Expected: `tsc` produces no output (success), and `node --test` prints `# pass 6` / `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd FRONTEND
git add lib/discover/scroll-math.ts lib/discover/scroll-math.test.ts
git commit -m "feat(discover): add settledIndex scroll-snap helper"
```

---

### Task 2: PlayerProvider preview mode

**Files:**
- Modify: `components/player/player-provider.tsx`
- Modify: `components/player/player-stage.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces (added to `PlayerContextValue`, consumed by Task 3):
  - `isPreviewing: boolean`
  - `enterPreview: () => void`
  - `previewTrack: (tracks: PlayerTrack[]) => void`
  - `commitPreview: (tracks: PlayerTrack[]) => void`
  - `exitPreview: () => void`

This task has no automated test — it depends on a live YouTube iframe / browser environment, which is exactly the class of code this repo already validates by hand (see `[[tazama-player-architecture]]`'s note that headless-Chrome YouTube tests are unreliable). Validate with `tsc`/`eslint` plus the manual pass in Step 6.

- [ ] **Step 1: Add preview-mode refs and state**

In `components/player/player-provider.tsx`, find:

```ts
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingRef = React.useRef<string | null>(null);
  /** Consecutive load errors — guards against looping a fully-dead queue. */
  const errorStreakRef = React.useRef(0);
```

Replace with:

```ts
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingRef = React.useRef<string | null>(null);
  /** Consecutive load errors — guards against looping a fully-dead queue. */
  const errorStreakRef = React.useRef(0);

  // ── discovery-feed preview mode ────────────────────────────────────────
  // While previewing, the raw iframe is driven directly (muted-loaded per
  // settled card) WITHOUT touching currentTrack/queue/order/orderPos — so
  // exiting preview has nothing to restore beyond the iframe itself.
  const previewingRef = React.useRef(false);
  const previewTracksRef = React.useRef<PlayerTrack[] | null>(null);
  const previewTrackIdxRef = React.useRef(0);
  const previewSnapshotRef = React.useRef<{
    track: PlayerTrack;
    positionMs: number;
    isPlaying: boolean;
    isMuted: boolean;
  } | null>(null);
```

Then find:

```ts
  // fullscreen / video view
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [videoMode, setVideoMode] = React.useState(false);
```

Replace with:

```ts
  // fullscreen / video view
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [videoMode, setVideoMode] = React.useState(false);

  // discovery-feed preview mode (mirrors previewingRef for consumers)
  const [isPreviewing, setIsPreviewingState] = React.useState(false);
```

- [ ] **Step 2: Add the preview-mode actions**

Find:

```ts
  /** Jump straight to a track in the current queue (the Up Next list). */
  const playQueueIndex = React.useCallback(
    (qi: number) => {
      const { queue, order } = latest.current;
      if (qi < 0 || qi >= queue.length) return;
      const pos = order.indexOf(qi);
      if (pos >= 0) playOrderPos(pos);
    },
    [playOrderPos],
  );

  // ── create the single, persistent player once the API is available ────────
```

Replace with:

```ts
  /** Jump straight to a track in the current queue (the Up Next list). */
  const playQueueIndex = React.useCallback(
    (qi: number) => {
      const { queue, order } = latest.current;
      if (qi < 0 || qi >= queue.length) return;
      const pos = order.indexOf(qi);
      if (pos >= 0) playOrderPos(pos);
    },
    [playOrderPos],
  );

  // ── discovery-feed preview mode ────────────────────────────────────────
  const setPreviewing = React.useCallback((v: boolean) => {
    previewingRef.current = v;
    setIsPreviewingState(v);
  }, []);

  /** Snapshot whatever's playing and switch into muted preview mode. */
  const enterPreview = React.useCallback(() => {
    if (previewingRef.current) return;
    const { currentTrack, isPlaying, isMuted } = latest.current;
    previewSnapshotRef.current = currentTrack
      ? {
          track: currentTrack,
          positionMs: playerRef.current?.getCurrentTime()
            ? playerRef.current.getCurrentTime() * 1000
            : 0,
          isPlaying,
          isMuted,
        }
      : null;
    setPreviewing(true);
    if (!latest.current.isMuted) {
      setIsMuted(true);
      playerRef.current?.mute();
    }
  }, [setPreviewing]);

  /** Muted-load a mix's lead track. Falls through the list on a fatal error. */
  const previewTrack = React.useCallback(
    (tracks: PlayerTrack[]) => {
      if (!previewingRef.current || tracks.length === 0) return;
      previewTracksRef.current = tracks;
      previewTrackIdxRef.current = 0;
      commandLoad(tracks[0].youtubeId);
    },
    [commandLoad],
  );

  /** Unmute and make this mix the real now-playing queue. */
  const commitPreview = React.useCallback(
    (tracks: PlayerTrack[]) => {
      if (tracks.length === 0) return;
      setPreviewing(false);
      previewTracksRef.current = null;
      previewSnapshotRef.current = null;
      setIsMuted(false);
      playerRef.current?.unMute();
      play(tracks[0], tracks);
    },
    [play, setPreviewing],
  );

  /** Leave preview mode, restoring whatever was playing before enterPreview. */
  const exitPreview = React.useCallback(() => {
    if (!previewingRef.current) return;
    setPreviewing(false);
    previewTracksRef.current = null;
    const snap = previewSnapshotRef.current;
    previewSnapshotRef.current = null;
    const p = playerRef.current;

    if (!snap) {
      setIsMuted(false);
      p?.pauseVideo();
      p?.unMute();
      return;
    }

    commandLoad(snap.track.youtubeId);
    p?.seekTo(snap.positionMs / 1000, true);
    if (!snap.isPlaying) p?.pauseVideo();
    setIsMuted(snap.isMuted);
    if (snap.isMuted) p?.mute();
    else p?.unMute();
    setPositionMs(snap.positionMs);
  }, [commandLoad, setPreviewing]);

  // ── create the single, persistent player once the API is available ────────
```

- [ ] **Step 3: Guard the ENDED and onError handlers against preview mode**

Find:

```ts
          onStateChange: (e) => {
            const s = e.data;
            if (s === YT_STATE.PLAYING) {
              errorStreakRef.current = 0;
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (s === YT_STATE.BUFFERING) {
              setIsBuffering(true);
            } else if (s === YT_STATE.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (s === YT_STATE.ENDED) {
              setIsPlaying(false);
              setIsBuffering(false);
              const { repeat, order, orderPos } = latest.current;
              if (repeat === "one") {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } else {
                // repeat 'all' wraps; 'off' stops at the tail.
                advanceTo(nextOrderPos(orderPos, order.length, repeat));
              }
            }
            const d = e.target.getDuration();
            if (d > 0) setDurationMs(d * 1000);
          },
          onError: (e) => {
            const track = latest.current.currentTrack;
            if (!YT_FATAL_ERRORS.has(e.data) || !track) return;

            reportUnplayable(track.youtubeId); // silent
            errorStreakRef.current += 1;

            const { order, orderPos, repeat } = latest.current;
            // Stop if the whole queue appears dead (one full pass of errors).
            if (errorStreakRef.current >= Math.max(order.length, 1)) {
              setIsPlaying(false);
              setIsBuffering(false);
              return;
            }
            const eff: Repeat = repeat === "one" ? "all" : repeat;
            advanceTo(nextOrderPos(orderPos, order.length, eff));
          },
```

Replace with:

```ts
          onStateChange: (e) => {
            const s = e.data;
            if (s === YT_STATE.PLAYING) {
              errorStreakRef.current = 0;
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (s === YT_STATE.BUFFERING) {
              setIsBuffering(true);
            } else if (s === YT_STATE.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (s === YT_STATE.ENDED) {
              if (previewingRef.current) {
                // Loop the muted preview in place — never touch the real queue.
                e.target.seekTo(0, true);
                e.target.playVideo();
                return;
              }
              setIsPlaying(false);
              setIsBuffering(false);
              const { repeat, order, orderPos } = latest.current;
              if (repeat === "one") {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } else {
                // repeat 'all' wraps; 'off' stops at the tail.
                advanceTo(nextOrderPos(orderPos, order.length, repeat));
              }
            }
            const d = e.target.getDuration();
            if (d > 0) setDurationMs(d * 1000);
          },
          onError: (e) => {
            if (!YT_FATAL_ERRORS.has(e.data)) return;

            if (previewingRef.current) {
              const tracks = previewTracksRef.current;
              const idx = previewTrackIdxRef.current;
              const failed = tracks?.[idx];
              if (failed) reportUnplayable(failed.youtubeId);
              const nextIdx = idx + 1;
              if (tracks && nextIdx < tracks.length) {
                previewTrackIdxRef.current = nextIdx;
                commandLoad(tracks[nextIdx].youtubeId);
              }
              return;
            }

            const track = latest.current.currentTrack;
            if (!track) return;

            reportUnplayable(track.youtubeId); // silent
            errorStreakRef.current += 1;

            const { order, orderPos, repeat } = latest.current;
            // Stop if the whole queue appears dead (one full pass of errors).
            if (errorStreakRef.current >= Math.max(order.length, 1)) {
              setIsPlaying(false);
              setIsBuffering(false);
              return;
            }
            const eff: Repeat = repeat === "one" ? "all" : repeat;
            advanceTo(nextOrderPos(orderPos, order.length, eff));
          },
```

- [ ] **Step 4: Expose the new actions on the context**

Find:

```ts
  // ── fullscreen / video view ──────────────────────────────────────────────
  /** Whether the fullscreen now-playing view is open. */
  isExpanded: boolean;
  /** Within fullscreen: showing the actual YouTube video (vs. album artwork). */
  videoMode: boolean;
```

Replace with:

```ts
  // ── fullscreen / video view ──────────────────────────────────────────────
  /** Whether the fullscreen now-playing view is open. */
  isExpanded: boolean;
  /** Within fullscreen: showing the actual YouTube video (vs. album artwork). */
  videoMode: boolean;

  // ── discovery-feed preview mode ──────────────────────────────────────────
  /** True while a discovery-feed preview session is active. */
  isPreviewing: boolean;
```

Find:

```ts
  expand: (opts?: { video?: boolean }) => void;
  collapse: () => void;
  toggleVideo: () => void;
}
```

Replace with:

```ts
  expand: (opts?: { video?: boolean }) => void;
  collapse: () => void;
  toggleVideo: () => void;
  /** Snapshot whatever's playing and switch into muted preview mode. */
  enterPreview: () => void;
  /** Muted-load a mix's lead track (falls through the list on a fatal error). */
  previewTrack: (tracks: PlayerTrack[]) => void;
  /** Unmute and make this mix the real now-playing queue. */
  commitPreview: (tracks: PlayerTrack[]) => void;
  /** Leave preview mode, restoring whatever was playing before enterPreview. */
  exitPreview: () => void;
}
```

Find (the `value` object inside the `useMemo`):

```ts
      expand,
      collapse,
      toggleVideo,
    }),
    [
```

Replace with:

```ts
      expand,
      collapse,
      toggleVideo,
      isPreviewing,
      enterPreview,
      previewTrack,
      commitPreview,
      exitPreview,
    }),
    [
```

Find (the dependency array right after it):

```ts
      expand,
      collapse,
      toggleVideo,
    ],
  );
```

Replace with:

```ts
      expand,
      collapse,
      toggleVideo,
      isPreviewing,
      enterPreview,
      previewTrack,
      commitPreview,
      exitPreview,
    ],
  );
```

- [ ] **Step 5: Let PlayerStage show video during preview without the fullscreen chrome**

In `components/player/player-stage.tsx`, find:

```ts
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
```

Replace with:

```ts
  const { isExpanded, isPreviewing } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const videoVisible = isExpanded || isPreviewing;

  // Lock background scroll while the fullscreen view (or a discovery-feed
  // preview) is open.
  React.useEffect(() => {
    if (!videoVisible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [videoVisible]);

  return (
    <motion.div
      ref={stageRootRef}
      aria-hidden={!videoVisible}
      initial={false}
      animate={{ opacity: videoVisible ? 1 : 0 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
      className={cn(
        "fixed inset-0 z-50 bg-black",
        isExpanded ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
```

Note: `FullscreenPlayer` chrome stays gated on the `{isExpanded && (...)}` block further down in the same file — leave that untouched. It must NOT render while merely previewing.

- [ ] **Step 6: Static verification**

Run:
```bash
cd FRONTEND
npx tsc --noEmit
npx eslint components/player/player-provider.tsx components/player/player-stage.tsx
```
Expected: both commands exit with no errors.

This task has no functional manual-verification step of its own: `enterPreview`/`previewTrack`/`commitPreview`/`exitPreview` have no caller yet, so there's nothing in the running app that exercises them until Task 3's route exists. Confirm you haven't regressed the *existing* fullscreen player while you're in the dev server anyway — open any track, tap the now-playing bar to expand it, confirm `FullscreenPlayer`'s transport controls (scrubber, skip, play/pause) still render and work exactly as before (this is the regression `isPreviewing` could plausibly cause, since it now shares the same visibility branch in `PlayerStage`). Full preview-mode verification happens in Task 3 Step 5.

- [ ] **Step 7: Commit**

```bash
cd FRONTEND
git add components/player/player-provider.tsx components/player/player-stage.tsx
git commit -m "feat(player): add discovery-feed preview mode"
```

---

### Task 3: Discover route, feed, and card

**Files:**
- Create: `app/dashboard/discover/page.tsx`
- Create: `components/discover/discover-card.tsx`
- Create: `components/discover/discover-feed.tsx`

**Interfaces:**
- Consumes: `getDiscovery(): Promise<Discovery>` and `type DiscoveryPlaylist` from `lib/discovery.ts` (existing); `settledIndex` from Task 1 (`lib/discover/scroll-math.ts`); `isPreviewing`/`enterPreview`/`previewTrack`/`commitPreview`/`exitPreview` from Task 2's `usePlayer()`; `LikeButton` (`components/likes/like-button.tsx`, existing) and `Cover` (`components/cover.tsx`, existing).
- Produces: the `/dashboard/discover` route, plus `DiscoverFeed({ playlists: DiscoveryPlaylist[] })` and `DiscoverCard({ playlist: DiscoveryPlaylist, onCommit: () => void })`, consumed by Task 4 (the nav link target).

No automated test — this is an integration of existing browser-dependent player state with scroll gestures; validated via `tsc`/`eslint` + a manual dev-server pass (Step 5).

- [ ] **Step 1: Create the card**

Create `components/discover/discover-card.tsx`:

```tsx
"use client";

import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { LikeButton } from "@/components/likes/like-button";
import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";
import type { DiscoveryPlaylist } from "@/lib/discovery";

/**
 * One full-screen card in the discovery feed. The actual muted/committed
 * video comes from the app's single shared YouTube iframe (rendered by
 * PlayerStage, fixed above everything) — this card only renders the poster
 * fallback plus its own text/like/tap chrome on top of it.
 */
export function DiscoverCard({
  playlist,
  onCommit,
}: {
  playlist: DiscoveryPlaylist;
  onCommit: () => void;
}) {
  const { currentTrack, isPlaying } = usePlayer();
  const lead = playlist.tracks[0];
  const committed =
    !!currentTrack && playlist.tracks.some((t) => t.id === currentTrack.id);

  return (
    <section className="relative h-dvh w-full snap-start snap-always">
      {lead && (
        <Cover
          title={playlist.title}
          src={lead.thumbnailUrl ?? undefined}
          sizes="100vw"
          className="absolute inset-0 h-full w-full rounded-none"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      <button
        type="button"
        onClick={onCommit}
        aria-label={`Play ${playlist.title}`}
        className="absolute inset-0 flex flex-col justify-end p-6 pb-28 text-left"
      >
        <span
          className={cn(
            "mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
            committed && isPlaying
              ? "bg-brand text-white"
              : "bg-white/15 text-white backdrop-blur-sm",
          )}
        >
          <Play className="size-3.5 fill-current" />
          {committed && isPlaying ? "Playing" : "Tap to play"}
        </span>
        <h2 className="font-heading text-3xl font-semibold text-white drop-shadow-sm">
          {playlist.title}
        </h2>
        <p className="mt-1 text-base text-white/80">{playlist.subtitle}</p>
      </button>

      {lead && (
        <LikeButton
          track={{
            videoId: lead.youtubeId,
            title: lead.title,
            artist: lead.artist,
            thumbnailUrl: lead.thumbnailUrl,
          }}
          size="lg"
          tone="onDark"
          className="absolute bottom-28 right-4 bg-black/40 backdrop-blur-sm"
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create the feed**

Create `components/discover/discover-feed.tsx`:

```tsx
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
    enterPreview(); // resume preview mode so further swiping keeps discovering
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
```

- [ ] **Step 3: Create the route**

Create `app/dashboard/discover/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { DiscoverFeed } from "@/components/discover/discover-feed";
import { getDiscovery } from "@/lib/discovery";

export const metadata: Metadata = {
  title: "Discover",
};

// A fresh shuffled batch every time the feed opens — same as Browse.
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { playlists } = await getDiscovery();

  if (playlists.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <p className="text-lg font-medium">No mixes to discover yet</p>
        <p className="max-w-xs text-sm text-white/70">
          Check back once the catalog has a few more tracks in it.
        </p>
        <Link href="/dashboard/browse" className="mt-2 text-sm font-semibold underline">
          Back to Browse
        </Link>
      </div>
    );
  }

  return <DiscoverFeed playlists={playlists} />;
}
```

- [ ] **Step 4: Static verification**

Run:
```bash
cd FRONTEND
npx tsc --noEmit
npx eslint app/dashboard/discover/page.tsx components/discover/discover-card.tsx components/discover/discover-feed.tsx
```
Expected: both commands exit with no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, sign in on a mobile-width viewport (devtools device toolbar), navigate directly to `/dashboard/discover`, and confirm:
- The first card's cover art shows immediately and its video starts muted within ~350ms.
- Swiping to the next card snaps cleanly; fast-swiping past 2-3 cards only loads video for the one you stop on (watch the Network tab / audio — no burst of simultaneous loads).
- Tapping a card unmutes it and it keeps playing after you swipe away (check the state persists — reopen `/dashboard/discover` from the bottom nav and the previously committed track should now be what `enterPreview` snapshots, i.e. swiping straight back out lands you on it still playing).
- The heart button likes the mix's lead track without triggering the card's own tap-to-commit (check `/dashboard/liked` afterward).
- Scrolling past the last mix shows the "You've hit today's mixes" card; tapping "Start over" scrolls back to the first card.
- The close (X) button returns to wherever you came from, and whatever was playing before you opened `/dashboard/discover` (if anything) resumes at the position/mute state it was at.

- [ ] **Step 6: Commit**

```bash
cd FRONTEND
git add app/dashboard/discover/page.tsx components/discover/discover-card.tsx components/discover/discover-feed.tsx
git commit -m "feat(discover): add TikTok-style playlist discovery feed"
```

---

### Task 4: Wire up the bottom nav

**Files:**
- Modify: `components/dashboard/mobile-bottom-nav.tsx`
- Modify: `app/dashboard/layout.tsx:91-97`

**Interfaces:**
- Consumes: the `/dashboard/discover` route from Task 3; `/dashboard/library` (pre-existing, unmodified).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Rewrite the bottom nav**

Replace the full contents of `components/dashboard/mobile-bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Library, MessageCircle, Search, type LucideIcon } from "lucide-react";

import { useChatsUnreadCount } from "@/components/notifications/notification-provider";
import { cn } from "@/lib/utils";

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const BEFORE: Item[] = [
  { label: "Home", href: "/dashboard", icon: House, exact: true },
  { label: "Search", href: "/dashboard/search", icon: Search },
];
const AFTER: Item[] = [
  { label: "Library", href: "/dashboard/library", icon: Library },
  { label: "Chats", href: "/dashboard/chats", icon: MessageCircle },
];

function isActive(item: Item, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, active, badge }: { item: Item; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-0.5 py-1"
    >
      <span className="relative">
        <Icon className={cn("size-5", active ? "text-foreground" : "text-muted-foreground")} />
        {Boolean(badge) && (
          <span
            aria-label={`${badge} unread`}
            className="absolute -right-2 -top-1.5 grid min-w-3.5 place-items-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-3.5 text-white"
          >
            {badge! > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

/**
 * 5-item quick-access bar for mobile, complementing (not replacing) the
 * hamburger drawer's full nav. The middle slot is the app's one sanctioned
 * brand-red action — into the TikTok-style discovery feed — rendered as an
 * elevated circular FAB that pops above the bar, matching the
 * tab-bar-with-center-action pattern (TikTok's "+", Instagram's post button).
 * Hidden entirely on /dashboard/discover, which is its own full-screen
 * takeover with its own close control.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const unreadChats = useChatsUnreadCount();

  if (pathname.startsWith("/dashboard/discover")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-xl md:hidden"
    >
      {BEFORE.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item, pathname)} />
      ))}

      <div className="flex flex-1 justify-center">
        <Link
          href="/dashboard/discover"
          aria-label="Discover playlists"
          className="inline-flex size-16 -translate-y-4 items-center justify-center rounded-full bg-brand-strong text-white shadow-lift transition-colors hover:bg-[#a82420]"
        >
          <Compass className="size-7" />
        </Link>
      </div>

      {AFTER.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item, pathname)}
          badge={item.href === "/dashboard/chats" ? unreadChats : undefined}
        />
      ))}
    </nav>
  );
}
```

This drops the `CreateRoomButton`/`AccountType`/`SubscriptionPlan` imports and the `accountType`/`currentPlan`/`origin` props entirely — the FAB no longer creates a room, and nothing else in this file needs those types.

- [ ] **Step 2: Drop the now-unused props at the call site**

In `app/dashboard/layout.tsx`, find:

```tsx
        <MobileBottomNav
          accountType={profile.accountType}
          currentPlan={currentPlan}
          origin={origin}
        />
```

Replace with:

```tsx
        <MobileBottomNav />
```

Leave the `getPlanForAccount`/`getOrigin`/`listLikedIds` calls and the rest of the file untouched — `Sidebar` and `MobileSidebar` still consume `currentPlan`/`origin`/`profile.accountType`.

- [ ] **Step 3: Static verification**

Run:
```bash
cd FRONTEND
npx tsc --noEmit
npx eslint components/dashboard/mobile-bottom-nav.tsx app/dashboard/layout.tsx
```
Expected: both commands exit with no errors. In particular, confirm `tsc` doesn't flag `app/dashboard/layout.tsx` for an unused `origin`/`currentPlan` binding — it shouldn't, since both are still passed to `Sidebar`/`MobileSidebar` a few lines above.

- [ ] **Step 4: Manual verification**

Run `npm run dev` on a mobile-width viewport and confirm:
- The bottom nav shows Home, Search, the red Compass FAB, Library, Chats (in that order).
- Tapping Library opens `/dashboard/library` (the existing rooms/liked-songs/recently-played page).
- Tapping the Compass FAB opens `/dashboard/discover` and the bottom nav disappears while there; closing it (the feed's own X button) brings the bottom nav back.
- Room creation is still reachable from the hamburger drawer, `/dashboard/live`, and `/dashboard/library`.

- [ ] **Step 5: Commit**

```bash
cd FRONTEND
git add components/dashboard/mobile-bottom-nav.tsx app/dashboard/layout.tsx
git commit -m "feat(nav): swap AI Chat for Library, repurpose the FAB into discovery"
```

---

## Self-Review Notes

- **Spec coverage**: entry point (Task 4), data reuse + no new API route (Task 3 Step 3), preview-mode playback integration including the `isExpanded` vs `isPreviewing` distinction (Task 2), shell/immersive UI + close control (Task 3 Step 2-3), end-of-feed card in place of true infinite wraparound (Task 3 Step 2), unplayable-track fallthrough (Task 2 Step 3), like button (Task 3 Step 1), bottom-nav Library swap (Task 4 Step 1) — every spec section maps to a task.
- **Placeholder scan**: no TBD/TODO; every step has complete code or an exact command with expected output.
- **Type consistency**: `PlayerTrack` (id/youtubeId/title/artist/thumbnailUrl) and `Track`/`DiscoveryPlaylist.tracks` share the same field names, so `playlist.tracks` is passed directly wherever `PlayerTrack[]` is expected — no remapping layer, matching how the existing `PlaylistCard` already does this (`play(first, playlist.tracks)`). `previewTrack`/`commitPreview`/`enterPreview`/`exitPreview` names match exactly between Task 2's `PlayerContextValue` and Task 3's `usePlayer()` destructuring.
