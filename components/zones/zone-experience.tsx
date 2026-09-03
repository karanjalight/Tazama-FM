"use client";

/**
 * The Zone Room — lets a consumer join a business's Audio Zone the way they'd
 * join a Room: see/hear what's playing in sync, suggest a track that
 * actually feeds the real rotation, see whatever a Schedule override is
 * currently showing, and react (visible to other joiners AND on the
 * physical kiosk screens — see `kiosk-room-player.tsx`'s own
 * `useZoneChannel` subscription).
 *
 * Deliberately NOT a fork of `RoomExperience` (see the Zone Rooms plan's
 * architecture notes) — there's no backing `rooms` row and no human host,
 * so this is a much smaller orchestration: always a listener
 * (`useZonePlayback`, the exact mechanism the kiosk already uses), never a
 * driver. A joiner can toggle their own local sync on/off but can never
 * play/pause/seek the zone's actual playback — the same host/listener split
 * Rooms already enforces, just with nobody ever cast as the host here.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Radio, Share2, ListMusic, Users, Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ZoneStage } from "./zone-stage";
import { ZoneQueuePanel } from "./zone-queue-panel";
import { AddTrackPanel } from "@/components/rooms/add-track-panel";
import { ParticipantsPanel } from "@/components/rooms/participants-panel";
import { ReactionBar, type FloatingItem } from "@/components/rooms/room-reactions";
import { useYouTube } from "@/lib/rooms/use-youtube";
import { useZoneChannel } from "@/lib/business/use-zone-channel";
import {
  useBranchPlayback,
  useZonePlayback,
  useSchedulePlayback,
  requestScheduleAdvance,
  requestScheduleContentAdvance,
  type ScheduleContentSnapshot,
} from "@/lib/business/use-branch-playback";
import { cn } from "@/lib/utils";
import { roomUrl } from "@/lib/rooms/slug";
import { suggestZoneTrack, toggleZoneQueueLike, removeZoneQueueItem, fetchZoneQueue } from "@/app/zones/actions";
import { ScheduleContentDisplay } from "@/components/business/schedules/schedule-content-display";
import type { AudioZone } from "@/lib/business/audio-zone-types";
import type { ZoneQueueItem } from "@/lib/business/zone-queue";
import type { RoomPlayback, RoomTrack, RoomViewer } from "@/lib/rooms/types";
import type { PlaybackPayload } from "@/lib/rooms/channel";

const DRIFT_MS = 1500;
const SCHEDULE_POLL_MS = 25_000;
const FALLBACK_CONTENT_SECONDS = 30;
/** Slack added on top of a computed "seconds until session end" before
 * arming a timer from it — see kiosk-room-player.tsx's identical constant. */
const SESSION_BOUNDARY_BUFFER_SECONDS = 2;
/** "Recheck" duration armed when the current session has no visual content
 * at all — deliberately huge so only the session-boundary cap in
 * `armContentTimer` can make this fire soon; see kiosk-room-player.tsx's
 * identical constant for the full reasoning. */
const NO_CONTENT_RECHECK_SECONDS = 24 * 60 * 60;

export function ZoneExperience({
  zone,
  viewer,
  initialQueue,
  initialRoomPlayback,
  origin,
}: {
  zone: AudioZone;
  viewer: RoomViewer;
  initialQueue: ZoneQueueItem[];
  /** Seeded only for a non-`synchronizedPlayback` zone (the default) — its
   * covered room's own `room_playback`, the same source that room's kiosk
   * itself plays from. A synchronized zone instead seeds from `zone.playback`
   * below. See `resolvePlaybackTarget` for why these are two different tables. */
  initialRoomPlayback: RoomPlayback | null;
  origin: string;
}) {
  // The room a non-synchronized zone's playback/suggestions actually live on
  // — see `resolvePlaybackTarget`. Every real zone today covers exactly one
  // room, so this is exact, not a guess.
  const primaryRoomId = zone.roomIds[0] ?? null;
  const initialSnapshot = zone.synchronizedPlayback ? zone.playback : initialRoomPlayback;

  const [joined, setJoined] = React.useState(false);
  const [nowPlaying, setNowPlaying] = React.useState<RoomTrack | null>(initialSnapshot?.track ?? null);
  const [zoneTrack, setZoneTrack] = React.useState<RoomTrack | null>(initialSnapshot?.track ?? null);
  const [queue, setQueue] = React.useState<ZoneQueueItem[]>(initialQueue);
  const [reactions, setReactions] = React.useState<FloatingItem[]>([]);
  const [synced, setSynced] = React.useState(true);
  const [scheduleContent, setScheduleContent] = React.useState<ScheduleContentSnapshot | null>(null);
  const [activeScheduleId, setActiveScheduleId] = React.useState<string | null>(null);

  const appliedIdRef = React.useRef<string | null>(initialSnapshot?.track?.youtubeId ?? null);
  const pendingSeekRef = React.useRef<number | null>(null);
  const pauseAfterLoadRef = React.useRef(false);
  const lastPayloadRef = React.useRef<PlaybackPayload | null>(null);
  const syncedRef = React.useRef(true);
  const ytPlayingRef = React.useRef(false);
  const zoneVersionRef = React.useRef(zone.playback?.version ?? 0);
  const scheduleVersionRef = React.useRef(0);
  const contentTimerRef = React.useRef<number | null>(null);
  // Freshest known "seconds until the current session ends" — caps a
  // content item's own duration so a session boundary is noticed on time
  // instead of only whenever the previously-showing item's own duration
  // happens to expire (see schedule-playback.ts / kiosk-room-player.tsx,
  // which mirrors this same mechanism).
  const sessionEndsInSecondsRef = React.useRef<number | null>(null);
  const reactionIdRef = React.useRef(0);
  const queueRef = React.useRef(queue);
  const requestScheduleContentAdvanceRef = React.useRef<((alsoRecheckTrack?: boolean) => void) | null>(null);

  React.useEffect(() => void (syncedRef.current = synced), [synced]);
  React.useEffect(() => void (queueRef.current = queue), [queue]);

  /* ------------------------------ the player ------------------------------ */

  const { api: yt, containerRef } = useYouTube({});

  const ytRef = React.useRef(yt);
  React.useEffect(() => {
    ytRef.current = yt;
    ytPlayingRef.current = yt.isPlaying;
  });

  const loadTrack = React.useCallback((track: RoomTrack) => {
    appliedIdRef.current = track.youtubeId;
    ytRef.current.load(track.youtubeId);
  }, []);

  React.useEffect(() => {
    if (!yt.isPlaying) return;
    if (pendingSeekRef.current != null) {
      const target = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const durationMs = ytRef.current.getDurationMs();
      // Same desync `applyZonePayload` guards against, reached via a fresh
      // load instead of an already-loaded track — a Zone Room never drives
      // playback, so just skip the nonsensical seek (see that guard's own
      // comment) rather than seeking somewhere past the track's real end.
      if (!(durationMs > 0 && target > durationMs)) ytRef.current.seek(target);
    }
    if (pauseAfterLoadRef.current) {
      ytRef.current.pause();
      pauseAfterLoadRef.current = false;
    }
  }, [yt.isPlaying]);

  const applyZonePayload = React.useCallback(
    (p: PlaybackPayload) => {
      setNowPlaying(p.track);
      if (!p.track) {
        ytRef.current.pause();
        return;
      }
      const expected = p.positionMs + (p.isPlaying ? Date.now() - p.at : 0);
      if (appliedIdRef.current !== p.track.youtubeId) {
        loadTrack(p.track);
        pendingSeekRef.current = expected;
        pauseAfterLoadRef.current = !p.isPlaying;
        return;
      }
      const durationMs = ytRef.current.getDurationMs();
      if (durationMs > 0 && expected > durationMs) {
        // `expected` has outgrown the track's own real length — the row is
        // desynced (see kiosk-room-player.tsx's identical guard for the full
        // story). A Zone Room joiner never drives playback, so it can't
        // self-heal this like the kiosk does; just skip the seek and wait
        // for a real advance (from a kiosk) to correct the row.
        return;
      }
      if (Math.abs(ytRef.current.getPositionMs() - expected) > DRIFT_MS) ytRef.current.seek(expected);
      if (p.isPlaying && !ytPlayingRef.current) ytRef.current.play();
      if (!p.isPlaying && ytPlayingRef.current) ytRef.current.pause();
    },
    [loadTrack],
  );
  const applyZonePayloadRef = React.useRef(applyZonePayload);
  React.useEffect(() => void (applyZonePayloadRef.current = applyZonePayload));

  const handlePlayback = React.useCallback(
    (p: PlaybackPayload) => {
      lastPayloadRef.current = p;
      setZoneTrack(p.track);
      if (syncedRef.current) applyZonePayload(p);
      else setNowPlaying(p.track);
    },
    [applyZonePayload],
  );

  // Exactly one of these two is ever enabled for a given zone — a
  // synchronized zone's canonical `audio_zone_playback`, or (the default)
  // its covered room's own `room_playback`, the same source that room's
  // kiosk itself plays from (see `resolvePlaybackTarget`).
  useZonePlayback(zone.id, joined && zone.synchronizedPlayback, (p, version) => {
    zoneVersionRef.current = version;
    handlePlayback(p);
  });
  useBranchPlayback(primaryRoomId ?? "", joined && !zone.synchronizedPlayback && !!primaryRoomId, handlePlayback);

  /* ------------------------- schedule override content -------------------- */

  const armContentTimer = React.useCallback((seconds: number) => {
    if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
    const requested = Math.max(1, seconds);
    const boundary = sessionEndsInSecondsRef.current;
    const boundaryWithSlack = boundary != null ? boundary + SESSION_BOUNDARY_BUFFER_SECONDS : null;
    const boundaryIsTighter = boundaryWithSlack != null && boundaryWithSlack < requested;
    const effective = boundaryIsTighter ? boundaryWithSlack : requested;
    contentTimerRef.current = window.setTimeout(() => {
      requestScheduleContentAdvanceRef.current?.(boundaryIsTighter);
    }, effective * 1000);
  }, []);

  const handleScheduleContentAdvance = React.useCallback(
    (alsoRecheckTrack?: boolean) => {
      if (!activeScheduleId) return;
      const scheduleId = activeScheduleId;
      requestScheduleContentAdvance(scheduleId, scheduleVersionRef.current).then((result) => {
        if (!result) return;
        scheduleVersionRef.current = result.version;
        sessionEndsInSecondsRef.current = result.sessionEndsInSeconds;
        setScheduleContent(result.content);
        armContentTimer(
          result.contentRecheckInSeconds ?? (result.content ? (result.content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS),
        );
      });
      if (alsoRecheckTrack) {
        requestScheduleAdvance(scheduleId, scheduleVersionRef.current).then((result) => {
          if (!result) return;
          scheduleVersionRef.current = result.version;
          sessionEndsInSecondsRef.current = result.sessionEndsInSeconds;
          if (result.payload) applyZonePayloadRef.current(result.payload);
        });
      }
    },
    [activeScheduleId, armContentTimer],
  );
  React.useEffect(() => void (requestScheduleContentAdvanceRef.current = handleScheduleContentAdvance));

  useSchedulePlayback(activeScheduleId ?? "", joined && !!activeScheduleId, (p, content, version) => {
    scheduleVersionRef.current = version;
    handlePlayback(p);
    if (content?.contentItemId !== scheduleContent?.contentItemId) {
      setScheduleContent(content);
      armContentTimer(content ? (content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS);
    }
  });

  // Same discovery + ~25s cadence the kiosk uses — any room the zone covers
  // resolves the same schedule, since schedule targeting already fans out
  // branch/zone/room coverage (see the Zone Rooms design notes).
  React.useEffect(() => {
    if (!joined || !primaryRoomId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/business/rooms/${primaryRoomId}/active-schedule`);
        const data = (await res.json()) as {
          scheduleId?: string | null;
          playback?: {
            track: RoomTrack | null;
            content: ScheduleContentSnapshot | null;
            isPlaying: boolean;
            positionMs: number;
            version: number;
            // When the *track* last changed — NOT `updatedAt`, which also
            // moves on a content-only write (see use-branch-playback.ts's
            // identical note on `useSchedulePlayback`).
            startedAt: string | null;
            updatedAt: string;
          } | null;
          sessionEndsInSeconds?: number;
          contentRecheckInSeconds?: number | null;
        };
        if (cancelled) return;
        const nextId = data.scheduleId ?? null;
        // Refreshed every tick (not just on schedule change) so the content
        // timer's session-boundary cap never goes more than ~25s stale.
        sessionEndsInSecondsRef.current = nextId ? (data.sessionEndsInSeconds ?? null) : null;
        setActiveScheduleId((current) => {
          if (current === nextId) return current;
          if (nextId && data.playback) {
            scheduleVersionRef.current = data.playback.version;
            setScheduleContent(data.playback.content);
            armContentTimer(
              data.contentRecheckInSeconds ??
                (data.playback.content ? (data.playback.content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS),
            );
            applyZonePayloadRef.current({
              track: data.playback.track,
              positionMs: data.playback.positionMs,
              isPlaying: data.playback.isPlaying,
              at: new Date(data.playback.startedAt ?? data.playback.updatedAt).getTime(),
            });
          } else if (!nextId) {
            setScheduleContent(null);
            if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
          }
          return nextId;
        });
      } catch {
        // Best-effort — a missed poll just means the override lags one cycle.
      }
    }

    poll();
    const id = setInterval(poll, SCHEDULE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
    };
  }, [joined, primaryRoomId, armContentTimer]);

  /* -------------------------------- queue ---------------------------------- */

  const refetchQueue = React.useCallback(async () => {
    const items = await fetchZoneQueue(zone.id);
    setQueue(items);
    queueRef.current = items;
  }, [zone.id]);

  /* ------------------------------ reactions -------------------------------- */

  const addFloating = React.useCallback((emoji: string, x: number) => {
    const id = `zr${reactionIdRef.current++}`;
    setReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2800);
  }, []);

  /* ------------------------------- channel --------------------------------- */

  const apiRef = React.useRef<ReturnType<typeof useZoneChannel> | null>(null);
  const channel = useZoneChannel({
    zoneId: zone.id,
    viewer,
    joined,
    handlers: {
      onReaction: (r) => addFloating(r.emoji, r.x),
      onQueuePing: () => void refetchQueue(),
    },
  });
  React.useEffect(() => void (apiRef.current = channel));

  function sendReaction(emoji: string) {
    const x = (reactionIdRef.current % 9) / 10 + 0.05;
    apiRef.current?.sendReaction({ emoji, x, from: viewer.id });
    addFloating(emoji, x);
  }

  /* -------------------------------- join ------------------------------------ */

  function join() {
    setJoined(true);
    const snap = initialSnapshot;
    if (snap?.track && snap.isPlaying) {
      loadTrack(snap.track);
      pendingSeekRef.current = snap.positionMs;
    }
    void refetchQueue();
  }

  /* ---------------------------- local controls ------------------------------ */

  function togglePlay() {
    if (yt.isPlaying) {
      setSynced(false);
      syncedRef.current = false;
      ytRef.current.pause();
    } else {
      setSynced(true);
      syncedRef.current = true;
      const p = lastPayloadRef.current;
      if (p) applyZonePayload(p);
      else ytRef.current.play();
    }
  }

  function toggleSync() {
    if (syncedRef.current) {
      setSynced(false);
      syncedRef.current = false;
    } else {
      setSynced(true);
      syncedRef.current = true;
      const p = lastPayloadRef.current;
      if (p) applyZonePayload(p);
    }
  }

  function seek(ms: number) {
    setSynced(false);
    syncedRef.current = false;
    yt.seek(ms);
  }

  /* --------------------------- queue actions -------------------------------- */

  async function onAdd(track: RoomTrack) {
    const res = await suggestZoneTrack(zone.id, track);
    if (!res.ok) {
      toast.error("Couldn't add that suggestion.");
      return;
    }
    apiRef.current?.sendQueuePing();
    await refetchQueue();
    toast.success("Added to the queue");
  }

  async function onLike(item: ZoneQueueItem) {
    setQueue((q) =>
      q
        .map((i) => (i.id === item.id ? { ...i, likedByMe: !i.likedByMe, likeCount: i.likeCount + (i.likedByMe ? -1 : 1) } : i))
        .sort((a, b) => b.likeCount - a.likeCount || a.createdAt.localeCompare(b.createdAt)),
    );
    await toggleZoneQueueLike(zone.id, item.id);
    apiRef.current?.sendQueuePing();
    await refetchQueue();
  }

  async function onRemove(item: ZoneQueueItem) {
    setQueue((q) => q.filter((i) => i.id !== item.id));
    await removeZoneQueueItem(zone.id, item.id);
    apiRef.current?.sendQueuePing();
    await refetchQueue();
  }

  function onPlayNow(item: ZoneQueueItem) {
    setSynced(false);
    syncedRef.current = false;
    loadTrack(item.track);
    setNowPlaying(item.track);
  }

  function share() {
    const url = zone.slug ? roomUrl(origin, zone.slug).replace("/rooms/", "/zones/") : origin;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Zone link copied"),
      () => toast.message(url),
    );
  }

  const queuedIds = React.useMemo(
    () => new Set([...queue.map((i) => i.track.youtubeId), ...(nowPlaying ? [nowPlaying.youtubeId] : [])]),
    [queue, nowPlaying],
  );

  const [mobileTab, setMobileTab] = React.useState<"queue" | "add" | "people">("queue");
  const mobileTabs: { id: "queue" | "add" | "people"; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "queue", label: "Up Next", icon: ListMusic, count: queue.length },
    { id: "add", label: "Add", icon: Plus },
    { id: "people", label: "People", icon: Users, count: channel.participants.length },
  ];

  /* -------------------------------- render ----------------------------------- */

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" aria-label="Back to dashboard" className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
              <span className="truncate">{zone.name}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-brand uppercase">
                <Radio className="size-3" /> Live
              </span>
            </h1>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Globe className="size-3" />
              {zone.branchName} · {channel.participants.length} listening
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" className="rounded-full" onClick={share}>
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Link href="/dashboard" className="ml-1 hidden sm:block">
            <Logo />
          </Link>
        </div>
      </header>

      {!joined ? (
        <main className="mx-auto grid min-h-[70svh] max-w-md place-items-center px-4">
          <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Radio className="size-7" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{zone.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{zone.branchName}</p>
            <Button variant="brand" size="xl" className="mt-6 w-full" onClick={join}>
              Join the room
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">Joining starts audio in sync with this zone.</p>
          </div>
        </main>
      ) : (
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            {scheduleContent && (
              <div className="overflow-hidden rounded-3xl border border-border bg-black">
                <ScheduleContentDisplay content={scheduleContent} className="aspect-video w-full" />
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Now showing: {scheduleContent.title}</p>
              </div>
            )}

            <ZoneStage
              containerRef={containerRef}
              nowPlaying={nowPlaying}
              zoneTrack={zoneTrack}
              synced={synced}
              isPlaying={yt.isPlaying}
              isBuffering={yt.isBuffering}
              positionMs={yt.positionMs}
              durationMs={yt.durationMs}
              reactions={reactions}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onToggleSync={toggleSync}
            />

            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2 sm:px-4 sm:py-2.5">
              <span className="hidden text-xs text-muted-foreground sm:block">Play in sync or go solo — like to upvote, suggest a track</span>
              <ReactionBar onSend={sendReaction} />
            </div>

            <div className="min-w-0 space-y-3 lg:hidden">
              <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/40 p-1">
                {mobileTabs.map((t) => {
                  const Icon = t.icon;
                  const active = mobileTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMobileTab(t.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors",
                        active ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                      {t.count !== undefined && <span className="shrink-0 font-mono text-xs text-muted-foreground">{t.count}</span>}
                    </button>
                  );
                })}
              </div>

              {mobileTab === "queue" && <ZoneQueuePanel items={queue} viewerId={viewer.id} onLike={onLike} onRemove={onRemove} onPlayNow={onPlayNow} />}
              {mobileTab === "add" && <AddTrackPanel suggestions={[]} queuedIds={queuedIds} onAdd={onAdd} />}
              {mobileTab === "people" && <ParticipantsPanel participants={channel.participants} listenerCap={9999} />}
            </div>
          </div>

          <aside className="hidden space-y-4 lg:block">
            {/* ParticipantsPanel bakes in a "N/cap" display — Audio Zones have
                no listenerCap concept at all, so this is a large sentinel
                rather than forking the component just to drop one number. */}
            <ParticipantsPanel participants={channel.participants} listenerCap={9999} />
            <AddTrackPanel suggestions={[]} queuedIds={queuedIds} onAdd={onAdd} />
            <ZoneQueuePanel items={queue} viewerId={viewer.id} onLike={onLike} onRemove={onRemove} onPlayNow={onPlayNow} />
          </aside>
        </main>
      )}
    </div>
  );
}
