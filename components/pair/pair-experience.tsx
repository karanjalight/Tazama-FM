"use client";

/**
 * Pair with a Screen — a guest's phone paired with one venue screen/speaker.
 * A pure mirror of the room plus a say in what plays next: see what's playing
 * and showing (signage, ads), request songs that play next without disturbing
 * the playlist, see who's here, react, and optionally listen in sync.
 *
 * Never drives venue playback. The only venue-side effect a guest has is a
 * `venue_requests` row, which the room's own advance path claims.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { ListMusic, MonitorPlay, Plus, Volume2, WifiOff, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { AddTrackPanel } from "@/components/rooms/add-track-panel";
import { ReactionBar, type FloatingItem } from "@/components/rooms/room-reactions";
import { HereNowStrip } from "@/components/pair/here-now-strip";
import { NowShowingCard } from "@/components/pair/now-showing-card";
import { PairJoinCard } from "@/components/pair/pair-join-card";
import { UpNextList } from "@/components/pair/up-next-list";
import { useZoneChannel } from "@/lib/business/use-zone-channel";
import { pairChannelName } from "@/lib/rooms/channel";
import { usePairLive } from "@/lib/pair/use-pair-live";
import { usePhoneListen } from "@/lib/pair/use-phone-listen";
import { removeRequest, requestSong, toggleRequestLike } from "@/app/pair/actions";
import { cn } from "@/lib/utils";
import type { PairDevice, PairRequest, PairState } from "@/lib/pair/types";
import type { RoomTrack, RoomViewer } from "@/lib/rooms/types";

type Tab = "next" | "request";

function PairHeader({ device, hereCount }: { device: PairDevice; hereCount: number | null }) {
  const DeviceIcon = device.kind === "audio" ? Volume2 : MonitorPlay;
  const place = [device.roomName, device.branchName].filter(Boolean).join(" · ");
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
          <DeviceIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{device.name}</p>
          {place && <p className="truncate text-xs text-muted-foreground">{place}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {hereCount !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {hereCount} here
          </span>
        )}
        <span className="hidden sm:block">
          <Logo />
        </span>
      </div>
    </header>
  );
}

export function PairExperience({
  device,
  roomId,
  viewer,
  needsPair,
  suggestedName,
  initialState,
}: {
  device: PairDevice;
  roomId: string;
  viewer: RoomViewer;
  needsPair: boolean;
  suggestedName: string;
  initialState: PairState;
}) {
  const router = useRouter();
  const paired = !needsPair;
  const listen = usePhoneListen();
  const { state, ad, refresh } = usePairLive({
    deviceSlug: device.slug,
    deviceId: device.id,
    roomId,
    initialState,
    enabled: paired,
    onPlayback: listen.sync,
  });

  const [tab, setTab] = React.useState<Tab>("next");
  const [requests, setRequests] = React.useState(state.requests);
  const [reactions, setReactions] = React.useState<FloatingItem[]>([]);
  const reactionIdRef = React.useRef(0);

  // Server state wins whenever it lands; optimistic edits only bridge the gap.
  const [syncedRequests, setSyncedRequests] = React.useState(state.requests);
  if (syncedRequests !== state.requests) {
    setSyncedRequests(state.requests);
    setRequests(state.requests);
  }

  const addFloating = React.useCallback((emoji: string, x: number) => {
    const id = `pr${reactionIdRef.current++}`;
    setReactions((prev) => [...prev, { id, emoji, x }]);
    window.setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2800);
  }, []);

  const channel = useZoneChannel({
    zoneId: roomId,
    channelName: pairChannelName(roomId),
    viewer,
    joined: paired,
    enabled: paired,
    handlers: {
      onReaction: (r) => addFloating(r.emoji, r.x),
      onQueuePing: () => refresh(),
    },
  });

  function sendReaction(emoji: string) {
    const x = (reactionIdRef.current % 9) / 10 + 0.05;
    channel.sendReaction({ emoji, x, from: viewer.id });
    addFloating(emoji, x);
  }

  async function onAdd(track: RoomTrack) {
    const result = await requestSong(device.slug, track);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Requested! It plays after the songs ahead of it.");
    channel.sendQueuePing();
    setTab("next");
    refresh();
  }

  async function onRemove(item: PairRequest) {
    setRequests((list) => list.filter((r) => r.id !== item.id));
    const result = await removeRequest(item.id);
    if (!result.ok) toast.error(result.error);
    channel.sendQueuePing();
    refresh();
  }

  async function onLike(item: PairRequest) {
    setRequests((list) =>
      list.map((r) => (r.id === item.id ? { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) } : r)),
    );
    const result = await toggleRequestLike(item.id);
    if (!result.ok) toast.error(result.error);
    channel.sendQueuePing();
    refresh();
  }

  const nowPlayingId = state.nowPlaying.track?.youtubeId ?? null;
  const queuedIds = React.useMemo(
    () => new Set([...requests.map((r) => r.track.youtubeId), ...(nowPlayingId ? [nowPlayingId] : [])]),
    [requests, nowPlayingId],
  );

  if (!paired) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <PairHeader device={device} hereCount={null} />
        <PairJoinCard device={device} suggestedName={suggestedName} onPaired={() => router.refresh()} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "next", label: "Up next", icon: ListMusic, count: requests.length },
    { id: "request", label: "Request a song", icon: Plus },
  ];

  return (
    <div className="min-h-svh bg-background text-foreground">
      <PairHeader device={device} hereCount={channel.participants.length || null} />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className="min-w-0 space-y-4">
          {!state.screenOnline && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <WifiOff className="mt-0.5 size-4 shrink-0" />
              <span>Nothing in this room looks online right now. Your requests will play once the screen is back.</span>
            </div>
          )}

          <NowShowingCard
            nowPlaying={state.nowPlaying}
            content={state.content}
            ad={ad}
            listening={listen.listening}
            listenBuffering={listen.isBuffering}
            playerRef={listen.containerRef}
            reactions={reactions}
            onToggleListen={listen.toggle}
          />

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2">
            <span className="hidden text-xs text-muted-foreground sm:block">React. Everyone here sees it.</span>
            <div className="mx-auto sm:mx-0">
              <ReactionBar onSend={sendReaction} />
            </div>
          </div>

          <HereNowStrip participants={channel.participants} viewerId={viewer.id} />
        </div>

        <aside className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/40 p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {t.count ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{t.count}</span> : null}
                </button>
              );
            })}
          </div>

          {tab === "next" ? (
            <UpNextList
              requests={requests}
              upcoming={state.upcoming}
              onLike={onLike}
              onRemove={onRemove}
              onRequest={() => setTab("request")}
            />
          ) : (
            <AddTrackPanel suggestions={[]} queuedIds={queuedIds} onAdd={onAdd} />
          )}
        </aside>
      </main>
    </div>
  );
}
