"use client";

/**
 * Full-bleed ad takeover for the kiosk (components/player/kiosk-room-player.tsx).
 * Renders one airing — video, image, audio or document — with an "Ad" chip
 * and countdown, then reports how it went through `onFinish`:
 *   - completed = true when the creative played out (video/audio `ended`, or
 *     an image/document's slot elapsed);
 *   - completed = false when the file failed to load. The slot is still held
 *     with a branded card until the airing's `endsAt`, so every screen in the
 *     break resumes together instead of this one cutting away early.
 * A screen that joins mid-airing seeks video/audio to the elapsed offset.
 */
import * as React from "react";
import { FileText, Megaphone, Music } from "lucide-react";

import { Equalizer } from "@/components/brand/equalizer";
import type { ActiveAdSnapshot } from "@/lib/business/ad-types";
import { cn } from "@/lib/utils";

/** Matches `duration-500` on the exit animation. */
const EXIT_MS = 500;
/** Extra time a video/audio ad may run past its reported length before the
 * kiosk gives up on it (a stalled stream must never hold the music forever). */
const MEDIA_OVERRUN_MS = 8_000;

function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function FallbackCard({ ad, icon: Icon }: { ad: ActiveAdSnapshot; icon: typeof Music }) {
  return (
    <div className="flex flex-col items-center gap-5 px-8 text-center">
      <span className="grid size-24 place-items-center rounded-full bg-white/10">
        <Icon className="size-10 text-white/80" />
      </span>
      <Equalizer bars={5} className="h-8" barClassName="w-1.5 bg-white/80" />
      <div>
        {ad.advertiser && <p className="text-sm font-semibold tracking-wide text-white/60 uppercase">{ad.advertiser}</p>}
        <p className="mt-1 max-w-xl text-3xl font-semibold text-balance text-white">{ad.title}</p>
      </div>
    </div>
  );
}

export function AdOverlay({
  ad,
  soundOn,
  volume,
  onFinish,
}: {
  ad: ActiveAdSnapshot;
  soundOn: boolean;
  /** 0–100, the kiosk's own volume. */
  volume: number;
  onFinish: (result: { completed: boolean; durationMs: number }) => void;
}) {
  const mediaRef = React.useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const mountedAtRef = React.useRef<number | null>(null);
  const finishedRef = React.useRef(false);
  const onFinishRef = React.useRef(onFinish);
  const [failed, setFailed] = React.useState(!ad.url && ad.contentType !== "document");
  const [exiting, setExiting] = React.useState(false);
  const [remaining, setRemaining] = React.useState(ad.durationSeconds);
  // When the file's real length is known (loadedmetadata), the media's own
  // end — not the server's estimate — decides how long it may run.
  const [mediaEndsAtMs, setMediaEndsAtMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const finish = React.useCallback((completed: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationMs = mountedAtRef.current == null ? 0 : Date.now() - mountedAtRef.current;
    setExiting(true);
    window.setTimeout(() => onFinishRef.current({ completed, durationMs }), EXIT_MS);
  }, []);

  const endsAtMs = Date.parse(ad.endsAt);
  const timed = ad.contentType === "video" || ad.contentType === "audio";

  React.useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  // Slot timer: images/documents (and any creative that failed to load) hold
  // the screen until the airing's own end. Working media normally finishes
  // via `ended`; this is only a safety cap for a stalled stream.
  React.useEffect(() => {
    const holdUntilEnd = !timed || failed;
    const until = holdUntilEnd ? endsAtMs : Math.max(endsAtMs, mediaEndsAtMs ?? 0) + MEDIA_OVERRUN_MS;
    const id = window.setTimeout(() => finish(!failed && !timed), Math.max(0, until - Date.now()));
    return () => window.clearTimeout(id);
  }, [endsAtMs, mediaEndsAtMs, timed, failed, finish]);

  // Countdown chip.
  React.useEffect(() => {
    const tick = () => {
      const media = mediaRef.current;
      if (timed && !failed && media && Number.isFinite(media.duration) && media.duration > 0) {
        setRemaining(media.duration - media.currentTime);
      } else {
        setRemaining((endsAtMs - Date.now()) / 1000);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAtMs, timed, failed]);

  React.useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !soundOn;
    media.volume = Math.min(1, Math.max(0, volume / 100));
  }, [soundOn, volume]);

  function handleLoadedMetadata() {
    const media = mediaRef.current;
    if (!media) return;
    const elapsed = (Date.now() - Date.parse(ad.startedAt)) / 1000;
    if (elapsed > 2 && Number.isFinite(media.duration) && elapsed < media.duration - 1) media.currentTime = elapsed;
    if (Number.isFinite(media.duration) && media.duration > 0) {
      setMediaEndsAtMs(Date.now() + (media.duration - media.currentTime) * 1000);
    }
    // Unmuted autoplay can be refused without a prior gesture — fall back to
    // muted playback rather than showing a frozen first frame.
    media.play().catch(() => {
      media.muted = true;
      media.play().catch(() => setFailed(true));
    });
  }

  const Icon = ad.contentType === "audio" ? Music : ad.contentType === "document" ? FileText : Megaphone;

  return (
    <div
      role="region"
      aria-label={`Advertisement: ${ad.title}`}
      className={cn(
        "absolute inset-0 z-30 grid place-items-center overflow-hidden bg-linear-to-br from-neutral-900 to-black duration-500",
        exiting ? "animate-out fade-out fill-mode-forwards" : "animate-in fade-in",
      )}
    >
      {failed ? (
        <FallbackCard ad={ad} icon={Icon} />
      ) : ad.contentType === "video" ? (
        <video
          ref={mediaRef}
          src={ad.url ?? undefined}
          playsInline
          preload="auto"
          muted={!soundOn}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => finish(true)}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : ad.contentType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary advertiser-uploaded aspect ratio on a kiosk-scale screen
        <img
          src={ad.url ?? undefined}
          alt={ad.title}
          onError={() => setFailed(true)}
          className={cn("size-full origin-center object-contain", !exiting && "animate-kenburns")}
        />
      ) : ad.contentType === "audio" ? (
        <>
          <audio
            ref={mediaRef}
            src={ad.url ?? undefined}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => finish(true)}
            onError={() => setFailed(true)}
          />
          <FallbackCard ad={ad} icon={Music} />
        </>
      ) : (
        <FallbackCard ad={ad} icon={FileText} />
      )}

      <div className="pointer-events-none absolute top-5 right-5 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm sm:top-7 sm:right-7">
        <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">Ad</span>
        {ad.advertiser && <span className="max-w-48 truncate">{ad.advertiser}</span>}
        <span className="font-mono tabular-nums text-white/70">{formatRemaining(remaining)}</span>
      </div>
    </div>
  );
}
