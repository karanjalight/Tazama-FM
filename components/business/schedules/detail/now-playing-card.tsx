"use client";

/**
 * Live "now playing" card for the Schedule Detail page — replaces the old
 * plain-text `Now: {title}` label with real artwork (the `Cover` component,
 * same as everywhere else in the app that shows a track), transport
 * controls, and a small "what content is showing / when's the next one"
 * strip with a live countdown.
 *
 * Genuinely live: subscribes via `useSchedulePlayback` (the same realtime
 * hook the kiosk/zone player use) instead of the page's old
 * `router.refresh()`-only approach, so a track that changes on its own
 * (natural end, or another client's action) updates here immediately —
 * mirroring the pattern `components/business/audio-zones/detail-panel.tsx`
 * already established for Audio Zones via `useZonePlayback`.
 */
import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Pause, Play, SkipForward, Search, FileText, Image as ImageIcon, Music, Video } from "lucide-react";

import { Cover } from "@/components/cover";
import { useSchedulePlayback, type ScheduleContentSnapshot } from "@/lib/business/use-branch-playback";
import { setSchedulePlayback, skipScheduleTrack, skipScheduleContent } from "@/app/business/schedules/actions";
import { PlayTrackDialog } from "./play-track-dialog";
import type { RoomTrack } from "@/lib/rooms/types";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Music, document: FileText } as const;

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function NowPlayingCard({
  branchId,
  scheduleId,
  scheduleActive,
  canControl,
  initialTrack,
  initialIsPlaying,
  initialContent,
  initialContentRecheckInSeconds,
}: {
  branchId: string;
  scheduleId: string;
  /** Subscribes whenever the schedule is active, regardless of
   * `synchronizedPlayback` — `schedule_playback` is populated and live
   * either way; only the *controls* below need the stricter gate. */
  scheduleActive: boolean;
  canControl: boolean;
  initialTrack: RoomTrack | null;
  initialIsPlaying: boolean;
  initialContent: ScheduleContentSnapshot | null;
  /** Only ever meaningful when `initialContent` is null (a `periodic`
   * session waiting between occurrences) — computed once, server-side, at
   * page load (see the page component). See this component's own countdown
   * effect for why it can't be kept fresh beyond the next realtime push. */
  initialContentRecheckInSeconds: number | null;
}) {
  const [track, setTrack] = React.useState(initialTrack);
  const [isPlaying, setIsPlaying] = React.useState(initialIsPlaying);
  const [content, setContent] = React.useState(initialContent);
  const [pending, setPending] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(initialContent?.displaySeconds ?? initialContentRecheckInSeconds);

  useSchedulePlayback(scheduleId, scheduleActive, (payload, liveContent) => {
    setTrack(payload.track);
    setIsPlaying(payload.isPlaying);
    setContent(liveContent);
    // A real push always carries its own fresh countdown when content is
    // showing; when it goes to null (a periodic session's "waiting" phase),
    // the row itself carries no "next occurrence" hint — only the page-load
    // seed above does, so the countdown just disappears here until reload.
    setCountdown(liveContent?.displaySeconds ?? null);
  });

  // Ticks the visible countdown down locally; keyed on "has a countdown at
  // all" rather than the number itself, so it doesn't tear down and rebuild
  // every second (the functional updater below needs no stale closure).
  const hasCountdown = countdown != null;
  React.useEffect(() => {
    if (!hasCountdown) return;
    const id = window.setInterval(() => {
      setCountdown((c) => (c == null ? null : Math.max(0, c - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasCountdown]);

  async function handlePlayPause() {
    setPending(true);
    const res = await setSchedulePlayback({ branchId, id: scheduleId, isPlaying: !isPlaying });
    setPending(false);
    if (!res.ok) toast.error(res.error);
  }

  async function handleSkipTrack() {
    const res = await skipScheduleTrack({ branchId, id: scheduleId });
    if (!res.ok) toast.error(res.error);
  }

  async function handleSkipContent() {
    const res = await skipScheduleContent({ branchId, id: scheduleId });
    if (!res.ok) toast.error(res.error);
  }

  const ContentIcon = content ? TYPE_ICON[content.contentType] : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Cover
          title={track?.title ?? "Nothing playing"}
          src={track?.thumbnailUrl ?? undefined}
          sizes="56px"
          className="size-14 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{track?.title ?? "Nothing playing yet"}</p>
          <p className="truncate text-xs text-muted-foreground">{track?.artist ?? "Waiting for a session's playlist to start"}</p>
        </div>

        {canControl && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={pending || !track}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-10 place-items-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              onClick={handleSkipTrack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <SkipForward className="size-3.5" />
              Skip track
            </button>
            <button
              type="button"
              onClick={handleSkipContent}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <SkipForward className="size-3.5" />
              Skip content
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Search className="size-3.5" />
              Search &amp; play
            </button>
          </div>
        )}
      </div>

      {(content || countdown != null) && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
            {content?.previewUrl ? (
              <Image src={content.previewUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
            ) : (
              <span className="grid size-full place-items-center">
                {ContentIcon ? <ContentIcon className="size-4 text-muted-foreground" /> : <Music className="size-4 text-muted-foreground" />}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">
            {content ? content.title : "Next content in"}
          </span>
          {countdown != null && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatCountdown(countdown)}</span>
          )}
        </div>
      )}

      <PlayTrackDialog open={pickerOpen} onOpenChange={setPickerOpen} branchId={branchId} scheduleId={scheduleId} />
    </div>
  );
}
