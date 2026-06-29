"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Lock,
  Share2,
  Radio,
  Power,
  ListMusic,
  Users,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { RoomStage } from "@/components/rooms/room-stage";
import { QueuePanel } from "@/components/rooms/queue-panel";
import { AddTrackPanel } from "@/components/rooms/add-track-panel";
import { ParticipantsPanel } from "@/components/rooms/participants-panel";
import { ReactionBar, type FloatingItem } from "@/components/rooms/room-reactions";
import { useYouTube } from "@/lib/rooms/use-youtube";
import { useRoomChannel } from "@/lib/rooms/use-room-channel";
import { roomGenreLabel } from "@/lib/room-genres";
import { cn } from "@/lib/utils";
import { FREE_MINUTES_CAP, type SubscriptionPlan } from "@/lib/billing/plans";
import { roomUrl } from "@/lib/rooms/slug";
import {
  addToQueue,
  toggleLike as toggleLikeAction,
  removeFromQueue,
  markPlayed,
  savePlayback,
  fetchQueue,
  joinRoom,
  setRoomLive,
} from "@/app/rooms/actions";
import type {
  Room,
  RoomViewer,
  RoomPlayback,
  QueueItem,
  RoomTrack,
  Participant,
} from "@/lib/rooms/types";
import type { PlaybackPayload } from "@/lib/rooms/channel";

const SYNC_TICK_MS = 2500;
const DRIFT_MS = 1500;
const PERSIST_EVERY_MS = 10000;
const CAP_MS = FREE_MINUTES_CAP * 60_000;

export function RoomExperience({
  room,
  viewer,
  isHost,
  hostPlan,
  listenerCap,
  initialPlayback,
  initialQueue,
  origin,
}: {
  room: Room;
  viewer: RoomViewer;
  isHost: boolean;
  hostPlan: SubscriptionPlan;
  listenerCap: number;
  initialPlayback: RoomPlayback | null;
  initialQueue: QueueItem[];
  origin: string;
}) {
  const router = useRouter();

  const [joined, setJoined] = React.useState(false);
  const [nowPlaying, setNowPlaying] = React.useState<RoomTrack | null>(
    initialPlayback?.track ?? null,
  );
  const [queue, setQueue] = React.useState<QueueItem[]>(initialQueue);
  const [suggestions, setSuggestions] = React.useState<RoomTrack[]>([]);
  const [reactions, setReactions] = React.useState<FloatingItem[]>([]);
  const [capped, setCapped] = React.useState(
    hostPlan === "free" &&
      (initialPlayback?.listeningMsTotal ?? 0) >= CAP_MS,
  );
  // Listeners follow the host by default ("synced"); they can break off and
  // drive their own player ("solo"), then re-sync. The host is always the
  // broadcast source, so this is meaningful only for non-hosts.
  const [synced, setSynced] = React.useState(true);
  // What the host is currently broadcasting (shown so a solo listener can rejoin).
  const [roomTrack, setRoomTrack] = React.useState<RoomTrack | null>(
    initialPlayback?.track ?? null,
  );

  // Mirrors for use inside stable callbacks / intervals.
  const nowPlayingRef = React.useRef(nowPlaying);
  const queueRef = React.useRef(queue);
  const suggestionsRef = React.useRef(suggestions);
  const participantsRef = React.useRef<Participant[]>([]);
  const appliedIdRef = React.useRef<string | null>(
    initialPlayback?.track?.youtubeId ?? null,
  );
  const pendingSeekRef = React.useRef<number | null>(null);
  const pauseAfterLoadRef = React.useRef(false);
  const cappedRef = React.useRef(capped);
  const syncedRef = React.useRef(true);
  const lastHostPayloadRef = React.useRef<PlaybackPayload | null>(null);
  const listeningMsRef = React.useRef(initialPlayback?.listeningMsTotal ?? 0);
  const unpersistedMsRef = React.useRef(0);
  const lastPersistRef = React.useRef(0);
  const apiRef = React.useRef<ReturnType<typeof useRoomChannel> | null>(null);
  const ytPlayingRef = React.useRef(false);
  const reactionId = React.useRef(0);
  // youtubeIds played recently — keeps the radio from looping the same songs.
  const recentIdsRef = React.useRef<Set<string>>(new Set());
  const refreshSuggestionsRef = React.useRef<(() => void) | null>(null);
  const autoStartedRef = React.useRef(false);

  React.useEffect(() => void (nowPlayingRef.current = nowPlaying), [nowPlaying]);
  React.useEffect(() => void (queueRef.current = queue), [queue]);
  React.useEffect(() => void (suggestionsRef.current = suggestions), [suggestions]);
  React.useEffect(() => void (cappedRef.current = capped), [capped]);
  React.useEffect(() => void (syncedRef.current = synced), [synced]);

  /* ----------------------------- the player ----------------------------- */

  // The host advances the room; a solo (un-synced) listener advances their own
  // stream. A synced listener waits for the host's next broadcast.
  const handleEnded = React.useCallback(() => {
    if (isHost || !syncedRef.current) advanceRef.current?.();
  }, [isHost]);

  const handleUnplayable = React.useCallback(() => {
    if (isHost || !syncedRef.current) {
      toast.message("That track can't be played here — skipping.");
      advanceRef.current?.();
    }
  }, [isHost]);

  const { api: yt, containerRef } = useYouTube({
    onEnded: handleEnded,
    onUnplayable: handleUnplayable,
  });

  // `yt` is a fresh object every render (position polls 4×/sec). Keep a stable
  // ref so effects/intervals don't tear down on every tick.
  const ytRef = React.useRef(yt);
  React.useEffect(() => {
    ytRef.current = yt;
    ytPlayingRef.current = yt.isPlaying;
  });

  const loadTrack = React.useCallback((youtubeId: string) => {
    appliedIdRef.current = youtubeId;
    ytRef.current.load(youtubeId);
  }, []);

  // Apply a pending seek (and optional pause) once playback actually starts.
  React.useEffect(() => {
    if (!yt.isPlaying) return;
    if (pendingSeekRef.current != null) {
      ytRef.current.seek(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
    if (pauseAfterLoadRef.current) {
      ytRef.current.pause();
      pauseAfterLoadRef.current = false;
    }
  }, [yt.isPlaying]);

  /* --------------------------- host: broadcast -------------------------- */

  const broadcastState = React.useCallback(() => {
    if (!isHost) return;
    apiRef.current?.sendPlayback({
      track: nowPlayingRef.current,
      positionMs: ytRef.current.getPositionMs(),
      isPlaying: ytPlayingRef.current,
      at: Date.now(),
      capped: cappedRef.current,
    });
  }, [isHost]);

  const persistSnapshot = React.useCallback(() => {
    if (!isHost) return;
    const delta = unpersistedMsRef.current;
    unpersistedMsRef.current = 0;
    void savePlayback(room.id, {
      track: nowPlayingRef.current,
      positionMs: ytRef.current.getPositionMs(),
      isPlaying: ytPlayingRef.current,
      listeningMsDelta: delta,
    });
  }, [isHost, room.id]);

  const playTrack = React.useCallback(
    (track: RoomTrack) => {
      setNowPlaying(track);
      nowPlayingRef.current = track;
      // Remember it so the radio doesn't loop the same couple of songs.
      recentIdsRef.current.add(track.youtubeId);
      if (recentIdsRef.current.size > 50) {
        recentIdsRef.current = new Set([...recentIdsRef.current].slice(-30));
      }
      loadTrack(track.youtubeId);
      // Only the host drives the shared room (broadcast + persist). A solo
      // listener just plays locally.
      if (isHost) {
        setTimeout(() => broadcastState(), 300);
        setTimeout(() => persistSnapshot(), 400);
      }
    },
    [loadTrack, broadcastState, persistSnapshot, isHost],
  );

  const refetchQueue = React.useCallback(async () => {
    const items = await fetchQueue(room.id);
    setQueue(items);
    queueRef.current = items;
  }, [room.id]);

  const playQueued = React.useCallback(
    (item: QueueItem) => {
      playTrack(item.track);
      void markPlayed(room.id, item.id).then(() => {
        apiRef.current?.sendQueuePing();
        refetchQueue();
      });
      setQueue((q) => q.filter((i) => i.id !== item.id));
    },
    [playTrack, room.id, refetchQueue],
  );

  // Auto-advance. The host consumes the shared queue (most-liked first) then
  // falls back to suggestions; a solo listener just rolls through suggestions
  // (their own endless stream) without touching the shared queue.
  const advance = React.useCallback(() => {
    const q = queueRef.current;
    if (isHost && q.length > 0) {
      playQueued(q[0]);
      return;
    }
    // Out of queued songs → roll the radio. Prefer something not played
    // recently so it stays varied; fall back to anything but the current one.
    const pool = suggestionsRef.current;
    const fresh = pool.filter(
      (s) =>
        s.youtubeId !== appliedIdRef.current &&
        !recentIdsRef.current.has(s.youtubeId),
    );
    const sug = fresh[0] ?? pool.find((s) => s.youtubeId !== appliedIdRef.current);
    if (sug) playTrack(sug);
    // Top the well back up when it's running low (or dry).
    if (fresh.length <= 2) refreshSuggestionsRef.current?.();
  }, [isHost, playQueued, playTrack]);
  // Latest-ref so the player's onEnded (created before `advance`) always calls
  // the current advance without re-creating the player.
  const advanceRef = React.useRef<(() => void) | null>(null);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    advanceRef.current = advance;
  }, [advance]);

  /* ----------------------- listener: follow host ----------------------- */

  // Mirror a host snapshot onto this client's player (load / seek / play-pause).
  const applyHostPayload = React.useCallback(
    (p: PlaybackPayload) => {
      setNowPlaying(p.track);
      nowPlayingRef.current = p.track;
      if (!p.track) {
        ytRef.current.pause();
        return;
      }
      const expected = p.positionMs + (p.isPlaying ? Date.now() - p.at : 0);
      if (appliedIdRef.current !== p.track.youtubeId) {
        loadTrack(p.track.youtubeId);
        pendingSeekRef.current = expected;
        pauseAfterLoadRef.current = !p.isPlaying;
        return;
      }
      if (Math.abs(ytRef.current.getPositionMs() - expected) > DRIFT_MS)
        ytRef.current.seek(expected);
      if (p.isPlaying && !ytPlayingRef.current) ytRef.current.play();
      if (!p.isPlaying && ytPlayingRef.current) ytRef.current.pause();
    },
    [loadTrack],
  );

  const handlePlayback = React.useCallback(
    (p: PlaybackPayload) => {
      if (isHost) return; // host owns the truth
      // Always remember what the room is playing (so a solo listener can rejoin).
      lastHostPayloadRef.current = p;
      setRoomTrack(p.track);
      setCapped(!!p.capped);
      // Only mirror it while we're following along.
      if (syncedRef.current) applyHostPayload(p);
    },
    [isHost, applyHostPayload],
  );

  /** Re-follow the host: snap to their latest broadcast (or ask for one). */
  const syncToRoom = React.useCallback(() => {
    setSynced(true);
    syncedRef.current = true;
    const p = lastHostPayloadRef.current;
    if (p) applyHostPayload(p);
    else apiRef.current?.requestSync();
  }, [applyHostPayload]);

  /** Listener toggle: follow the host, or break off and DJ your own player. */
  const toggleSync = React.useCallback(() => {
    if (syncedRef.current) {
      setSynced(false);
      syncedRef.current = false;
    } else {
      syncToRoom();
    }
  }, [syncToRoom]);

  /** A manual control by a synced listener breaks them off into solo mode. */
  const ensureControl = React.useCallback(() => {
    if (!isHost && syncedRef.current) {
      setSynced(false);
      syncedRef.current = false;
    }
  }, [isHost]);

  /* ------------------------------ reactions ----------------------------- */

  const addFloating = React.useCallback((emoji: string, x: number) => {
    const id = `r${reactionId.current++}`;
    setReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(
      () => setReactions((prev) => prev.filter((r) => r.id !== id)),
      2800,
    );
  }, []);

  const handleReaction = React.useCallback(
    (r: { emoji: string; x: number }) => addFloating(r.emoji, r.x),
    [addFloating],
  );

  /* ------------------------------ channel ------------------------------- */

  const channel = useRoomChannel({
    roomId: room.id,
    viewer,
    isHost,
    joined,
    handlers: {
      onPlayback: handlePlayback,
      onQueuePing: () => void refetchQueue(),
      onReaction: handleReaction,
      onSyncRequest: () => broadcastState(),
    },
  });
  React.useEffect(() => void (apiRef.current = channel));
  React.useEffect(
    () => void (participantsRef.current = channel.participants),
    [channel.participants],
  );

  /* --------------------------- suggestions ------------------------------ */

  const refreshSuggestions = React.useCallback(async () => {
    // Flat list WITH repeats — the server weights room genres by how many present
    // members favour each, and pulls in adjacent tastes proportionally.
    const participantGenres = [
      ...participantsRef.current.flatMap((p) => p.genres),
      ...viewer.genres,
    ];
    const exclude = [
      nowPlayingRef.current?.youtubeId,
      ...queueRef.current.map((i) => i.track.youtubeId),
    ].filter(Boolean) as string[];
    try {
      const res = await fetch("/api/rooms/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomGenres: room.genres,
          participantGenres,
          exclude,
        }),
      });
      const data = (await res.json()) as { tracks?: RoomTrack[] };
      setSuggestions(data.tracks ?? []);
    } catch {
      /* suggestions are best-effort */
    }
  }, [room.genres, viewer.genres]);

  // Refresh suggestions as the roster shifts (the room's taste changes).
  const rosterSize = channel.participants.length;
  React.useEffect(() => {
    if (!joined) return;
    const t = setTimeout(() => void refreshSuggestions(), 1500);
    return () => clearTimeout(t);
  }, [joined, rosterSize, refreshSuggestions]);

  // Stable handle so `advance` (created earlier) can top up suggestions.
  React.useEffect(() => {
    refreshSuggestionsRef.current = refreshSuggestions;
  });

  // Host auto-DJ: once joined, if nothing's playing, start the queue (or a
  // suggestion) so the room is never silent. onEnded keeps it rolling after.
  React.useEffect(() => {
    if (!isHost || !joined || autoStartedRef.current) return;
    if (nowPlayingRef.current) {
      autoStartedRef.current = true; // already has a track (e.g. a snapshot)
      return;
    }
    if (queueRef.current.length > 0 || suggestionsRef.current.length > 0) {
      autoStartedRef.current = true;
      advance();
    }
  }, [isHost, joined, queue, suggestions, advance]);

  /* ----------------------- host sync loop + play/pause ------------------ */

  React.useEffect(() => {
    if (!isHost || !joined) return;
    const id = window.setInterval(() => {
      if (ytPlayingRef.current) {
        listeningMsRef.current += SYNC_TICK_MS;
        unpersistedMsRef.current += SYNC_TICK_MS;
        if (
          hostPlan === "free" &&
          listeningMsRef.current >= CAP_MS &&
          !cappedRef.current
        ) {
          cappedRef.current = true;
          setCapped(true);
          ytRef.current.pause();
          toast.message("Preview limit reached — upgrade to keep playing.");
        }
      }
      broadcastState();
      const now = Date.now();
      if (now - lastPersistRef.current > PERSIST_EVERY_MS) {
        lastPersistRef.current = now;
        persistSnapshot();
      }
    }, SYNC_TICK_MS);
    return () => window.clearInterval(id);
  }, [isHost, joined, hostPlan, broadcastState, persistSnapshot]);

  // Broadcast immediately on play/pause + track change so listeners react fast.
  React.useEffect(() => {
    if (isHost && joined) broadcastState();
  }, [isHost, joined, yt.isPlaying, nowPlaying, broadcastState]);

  /* ------------------------------- join --------------------------------- */

  function join() {
    setJoined(true);
    void joinRoom(room.id);
    const snap = initialPlayback;
    if (isHost) {
      if (snap?.track) {
        loadTrack(snap.track.youtubeId);
        pendingSeekRef.current = snap.positionMs;
        pauseAfterLoadRef.current = !snap.isPlaying;
      }
    } else {
      if (snap?.track && snap.isPlaying) {
        loadTrack(snap.track.youtubeId);
        pendingSeekRef.current = snap.positionMs;
      }
      setTimeout(() => apiRef.current?.requestSync(), 700);
    }
    void refetchQueue();
    void refreshSuggestions();
  }

  /* ---------------------------- host controls --------------------------- */

  function togglePlay() {
    if (isHost && capped) {
      toast.message("Upgrade to keep the music going.");
      return;
    }
    ensureControl();
    if (yt.isPlaying) yt.pause();
    else yt.play();
  }

  function skip() {
    ensureControl();
    advance();
  }

  function seek(ms: number) {
    ensureControl();
    yt.seek(ms);
    if (isHost) setTimeout(() => broadcastState(), 100);
  }

  /* --------------------------- queue actions ---------------------------- */

  async function onAdd(track: RoomTrack) {
    const res = await addToQueue(room.id, track);
    if (!res.ok) {
      toast.error("Couldn't add that track.");
      return;
    }
    apiRef.current?.sendQueuePing();
    await refetchQueue();
    // If the host is idle with nothing playing, start it right away.
    if (isHost && !nowPlayingRef.current) advance();
  }

  async function onLike(item: QueueItem) {
    // Optimistic flip.
    setQueue((q) =>
      q
        .map((i) =>
          i.id === item.id
            ? {
                ...i,
                likedByMe: !i.likedByMe,
                likeCount: i.likeCount + (i.likedByMe ? -1 : 1),
              }
            : i,
        )
        .sort(
          (a, b) =>
            b.likeCount - a.likeCount || a.createdAt.localeCompare(b.createdAt),
        ),
    );
    await toggleLikeAction(room.id, item.id);
    apiRef.current?.sendQueuePing();
    await refetchQueue();
  }

  async function onRemove(item: QueueItem) {
    setQueue((q) => q.filter((i) => i.id !== item.id));
    await removeFromQueue(item.id);
    apiRef.current?.sendQueuePing();
    await refetchQueue();
  }

  // Anyone can play a queued track on their own player. The host's play drives
  // the room (and consumes the queue); a listener just previews it solo.
  function onPlayNow(item: QueueItem) {
    if (isHost) {
      playQueued(item);
    } else {
      ensureControl();
      playTrack(item.track);
    }
  }

  function sendReaction(emoji: string) {
    const x = (reactionId.current % 9) / 10 + 0.05;
    apiRef.current?.sendReaction({ emoji, x, from: viewer.id });
    addFloating(emoji, x);
  }

  async function endRoom() {
    await setRoomLive(room.id, false);
    toast.success("Hangout ended.");
    router.push("/dashboard");
  }

  function share() {
    const url = roomUrl(origin, room.slug);
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Room link copied"),
      () => toast.message(url),
    );
  }

  const queuedIds = React.useMemo(
    () =>
      new Set([
        ...queue.map((i) => i.track.youtubeId),
        ...(nowPlaying ? [nowPlaying.youtubeId] : []),
      ]),
    [queue, nowPlaying],
  );

  const full = !isHost && channel.participants.length >= listenerCap;

  // Mobile uses a segmented control to switch panels; desktop shows all three.
  const [mobileTab, setMobileTab] = React.useState<"queue" | "add" | "people">(
    "queue",
  );
  const mobileTabs: {
    id: "queue" | "add" | "people";
    label: string;
    icon: LucideIcon;
    count?: number;
  }[] = [
    { id: "queue", label: "Up Next", icon: ListMusic, count: queue.length },
    { id: "add", label: "Add", icon: Plus },
    {
      id: "people",
      label: "People",
      icon: Users,
      count: channel.participants.length,
    },
  ];

  /* ------------------------------- render ------------------------------- */

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
              <span className="truncate">{room.name}</span>
              {room.isLive && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-brand uppercase">
                  <Radio className="size-3" /> Live
                </span>
              )}
            </h1>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {room.access === "private" ? (
                <Lock className="size-3" />
              ) : (
                <Globe className="size-3" />
              )}
              {room.access === "private" ? "Private" : "Public"} ·{" "}
              {channel.participants.length} listening
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" className="rounded-full" onClick={share}>
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {isHost && joined && (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full"
              onClick={endRoom}
            >
              <Power className="size-3.5" />
              <span className="hidden sm:inline">End</span>
            </Button>
          )}
          <Link href="/dashboard" className="ml-1 hidden sm:block">
            <Logo />
          </Link>
        </div>
      </header>

      {!joined ? (
        <Lobby
          room={room}
          hostName={isHost ? "you" : undefined}
          listeners={channel.participants.length}
          listenerCap={listenerCap}
          full={full}
          onJoin={join}
        />
      ) : (
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <RoomStage
              containerRef={containerRef}
              nowPlaying={nowPlaying}
              roomTrack={roomTrack}
              isHost={isHost}
              synced={synced}
              isPlaying={yt.isPlaying}
              isBuffering={yt.isBuffering}
              positionMs={yt.positionMs}
              durationMs={yt.durationMs}
              capped={capped}
              reactions={reactions}
              onTogglePlay={togglePlay}
              onSkip={skip}
              onSeek={seek}
              onToggleSync={toggleSync}
            />

            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2 sm:px-4 sm:py-2.5">
              <span className="hidden text-xs text-muted-foreground sm:block">
                {isHost
                  ? "You're the host — play anything, anytime"
                  : "Play in sync or go solo — like to upvote, add a track"}
              </span>
              <ReactionBar onSend={sendReaction} />
            </div>

            {room.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {room.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {roomGenreLabel(g)}
                  </span>
                ))}
              </div>
            )}

            {/* Mobile: segmented panels. Desktop shows all three in the aside. */}
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
                        active
                          ? "bg-background text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                      {t.count !== undefined && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {mobileTab === "queue" && (
                <QueuePanel
                  items={queue}
                  isHost={isHost}
                  onLike={onLike}
                  onRemove={onRemove}
                  onPlayNow={onPlayNow}
                />
              )}
              {mobileTab === "add" && (
                <AddTrackPanel
                  suggestions={suggestions}
                  queuedIds={queuedIds}
                  onAdd={onAdd}
                />
              )}
              {mobileTab === "people" && (
                <ParticipantsPanel
                  participants={channel.participants}
                  listenerCap={listenerCap}
                />
              )}
            </div>
          </div>

          {/* Desktop: persistent side column */}
          <aside className="hidden space-y-4 lg:block">
            <ParticipantsPanel
              participants={channel.participants}
              listenerCap={listenerCap}
            />
            <AddTrackPanel
              suggestions={suggestions}
              queuedIds={queuedIds}
              onAdd={onAdd}
            />
            <QueuePanel
              items={queue}
              isHost={isHost}
              onLike={onLike}
              onRemove={onRemove}
              onPlayNow={onPlayNow}
            />
          </aside>
        </main>
      )}
    </div>
  );
}

/* --------------------------------- lobby --------------------------------- */

function Lobby({
  room,
  listeners,
  listenerCap,
  full,
  onJoin,
}: {
  room: Room;
  hostName?: string;
  listeners: number;
  listenerCap: number;
  full: boolean;
  onJoin: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[70svh] max-w-md place-items-center px-4">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Radio className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          {room.name}
        </h2>
        {room.about && (
          <p className="mt-2 text-sm text-muted-foreground">{room.about}</p>
        )}
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {listeners}/{listenerCap} in the room
        </p>

        {full ? (
          <p className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            This room is full right now. Check back soon.
          </p>
        ) : (
          <Button
            variant="brand"
            size="xl"
            className="mt-6 w-full"
            onClick={onJoin}
          >
            Join the hangout
          </Button>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Joining starts audio and announces you to the room.
        </p>
      </div>
    </main>
  );
}
