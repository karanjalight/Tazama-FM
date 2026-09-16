"use client";

/**
 * Keeps a paired phone's view of the venue fresh:
 *  - realtime on whichever playback row currently drives the room (the same
 *    postgres_changes hooks the kiosk uses) → instant track/content/ad changes;
 *  - a debounced full refresh after any change or queue ping (requests,
 *    "requested by", up-next, durations all come from the server);
 *  - a 15s poll, which is also how a schedule starting or ending (a source
 *    switch) is noticed — same discovery-by-polling the kiosk relies on.
 */
import * as React from "react";

import { useBranchPlayback, useSchedulePlayback, useZonePlayback } from "@/lib/business/use-branch-playback";
import { fetchPairState } from "@/app/pair/actions";
import { adForDevice, fetchVenueAd, type VenueAd } from "@/lib/pair/venue-ad";
import type { ActiveAdSnapshot } from "@/lib/business/ad-types";
import type { ScheduleContentSnapshot } from "@/lib/business/schedule-types";
import type { PlaybackPayload } from "@/lib/rooms/channel";
import type { PairState } from "@/lib/pair/types";

const POLL_MS = 15_000;
const REFRESH_DEBOUNCE_MS = 600;

export function usePairLive({
  deviceSlug,
  deviceId,
  roomId,
  initialState,
  enabled,
  onPlayback,
}: {
  deviceSlug: string;
  deviceId: string;
  roomId: string;
  initialState: PairState;
  enabled: boolean;
  /** Every fresh playback snapshot, realtime or polled. */
  onPlayback: (p: PlaybackPayload) => void;
}): { state: PairState; ad: VenueAd | null; refresh: () => void } {
  const [state, setState] = React.useState(initialState);
  const [ad, setAd] = React.useState<VenueAd | null>(null);

  const onPlaybackRef = React.useRef(onPlayback);
  React.useEffect(() => {
    onPlaybackRef.current = onPlayback;
  });
  const debounceRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    const [next, nextAd] = await Promise.all([fetchPairState(deviceSlug), fetchVenueAd({ roomId, deviceId })]);
    setAd(nextAd);
    if (!next) return;
    setState(next);
    const np = next.nowPlaying;
    onPlaybackRef.current({ track: np.track, positionMs: np.positionMs, isPlaying: np.isPlaying, at: np.at });
  }, [deviceSlug, roomId, deviceId]);

  const refresh = React.useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void load(), REFRESH_DEBOUNCE_MS);
  }, [load]);

  React.useEffect(() => {
    if (!enabled) return;
    const first = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [enabled, load]);

  const handleRealtime = (p: PlaybackPayload, activeAd: ActiveAdSnapshot | null, content?: ScheduleContentSnapshot | null) => {
    setState((s) => {
      const sameTrack = !!p.track && p.track.youtubeId === s.nowPlaying.track?.youtubeId;
      return {
        ...s,
        nowPlaying: {
          track: p.track,
          positionMs: p.positionMs,
          isPlaying: p.isPlaying,
          at: p.at,
          durationMs: sameTrack ? s.nowPlaying.durationMs : null,
          requestedByName: sameTrack ? s.nowPlaying.requestedByName : null,
        },
        content: content === undefined ? s.content : content,
      };
    });
    setAd(adForDevice(activeAd, { roomId, deviceId }, Date.now()));
    onPlaybackRef.current(p);
    refresh();
  };

  const { kind, id } = state.source;
  useBranchPlayback(id, enabled && kind === "room", (p, activeAd) => handleRealtime(p, activeAd));
  useZonePlayback(id, enabled && kind === "zone", (p, _version, activeAd) => handleRealtime(p, activeAd));
  useSchedulePlayback(id, enabled && kind === "schedule", (p, content, _version, activeAd) =>
    handleRealtime(p, activeAd, content),
  );

  return { state, ad, refresh };
}
