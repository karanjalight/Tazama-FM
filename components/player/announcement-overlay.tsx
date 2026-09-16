"use client";

/**
 * Full-screen announcement takeover for the kiosk
 * (components/player/kiosk-room-player.tsx). Sits above everything, ads
 * included (z-40 vs the ad overlay's z-30), plays the recording, and calls
 * `onFinish` once it's over. The kiosk owns what happens to the music.
 *
 * It never gets stuck: a missing or broken file holds the card for the
 * announcement's length, and a stalled stream is abandoned a few seconds
 * past its expected end. A screen nobody has tapped yet can't play sound
 * (browser autoplay rules), so the card shows a tap hint and starts the audio
 * from the top as soon as someone taps.
 */
import * as React from "react";
import { Megaphone, Siren, Volume2 } from "lucide-react";

import { Equalizer } from "@/components/brand/equalizer";
import type { AnnouncementAiring } from "@/lib/business/announcement-airing";
import { categoryFromDb } from "@/lib/business/announcement-types";
import { cn } from "@/lib/utils";

/** Matches `duration-500` on the exit animation. */
const EXIT_MS = 500;
/** How long past its expected end playing audio may run before it's abandoned. */
const MEDIA_OVERRUN_MS = 8_000;
/** Card time for an announcement with no usable length (e.g. a recording whose
 * duration wasn't captured) that can't play. */
const FALLBACK_SECONDS = 8;
/** Safety-cap estimate for playing audio whose length is unknown (MediaRecorder
 * webm often reports an infinite duration). `ended` normally fires far sooner. */
const UNKNOWN_LENGTH_SECONDS = 120;

function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AnnouncementOverlay({
  airing,
  soundOn,
  volume,
  onFinish,
  onTap,
}: {
  airing: AnnouncementAiring;
  /** Whether this screen may play sound (someone has tapped it). A local
   * mute does NOT silence an announcement. */
  soundOn: boolean;
  /** 0–100, the kiosk's own volume. */
  volume: number;
  onFinish: () => void;
  /** A tap on the card — the kiosk uses it to unlock sound. */
  onTap: () => void;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const finishedRef = React.useRef(false);
  const onFinishRef = React.useRef(onFinish);
  const [failed, setFailed] = React.useState(!airing.audioUrl);
  const [playing, setPlaying] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  // When playing audio is expected to end — null until it actually starts,
  // when the card's own length (measured from mount) applies instead.
  const [audioEndsAtMs, setAudioEndsAtMs] = React.useState<number | null>(null);
  const mountedAtRef = React.useRef<number | null>(null);
  const [remaining, setRemaining] = React.useState(airing.durationSeconds || FALLBACK_SECONDS);

  const emergency = airing.category === "emergency";
  const knownSeconds = airing.durationSeconds > 0 ? airing.durationSeconds : null;

  React.useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const finish = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    audioRef.current?.pause();
    setExiting(true);
    window.setTimeout(() => onFinishRef.current(), EXIT_MS);
  }, []);

  // Declared before the timer effects below, so they always see it set.
  React.useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  /** When the card comes down if nothing else ends it. */
  const endsAt = React.useCallback(() => {
    if (audioEndsAtMs != null) return audioEndsAtMs;
    return (mountedAtRef.current ?? Date.now()) + (knownSeconds ?? FALLBACK_SECONDS) * 1000;
  }, [audioEndsAtMs, knownSeconds]);

  const startAudio = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || finishedRef.current) return;
    audio.currentTime = 0;
    audio.muted = false;
    audio
      .play()
      .then(() => {
        setPlaying(true);
        const seconds = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (knownSeconds ?? UNKNOWN_LENGTH_SECONDS);
        setAudioEndsAtMs(Date.now() + seconds * 1000);
      })
      .catch(() => {
        // Autoplay refused (no tap yet) — wait for `soundOn`, holding the card meanwhile.
      });
  }, [knownSeconds]);

  // Start (or restart from the top) whenever sound becomes available.
  React.useEffect(() => {
    if (soundOn && !failed && !playing) startAudio();
  }, [soundOn, failed, playing, startAudio]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = Math.min(1, Math.max(0, volume / 100));
  }, [volume]);

  // Safety cap: playing audio gets a grace period past its expected end;
  // a card with nothing playing comes down at the end itself.
  React.useEffect(() => {
    const until = playing && !failed ? endsAt() + MEDIA_OVERRUN_MS : endsAt();
    const id = window.setTimeout(finish, Math.max(0, until - Date.now()));
    return () => window.clearTimeout(id);
  }, [endsAt, playing, failed, finish]);

  React.useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (playing && audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        setRemaining(audio.duration - audio.currentTime);
      } else {
        setRemaining((endsAt() - Date.now()) / 1000);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, playing]);

  const Icon = emergency ? Siren : Megaphone;

  return (
    <div
      role="alert"
      aria-label={`Announcement: ${airing.title}`}
      onClick={onTap}
      className={cn(
        "absolute inset-0 z-40 grid place-items-center overflow-hidden duration-500",
        emergency ? "bg-linear-to-br from-red-950 via-red-900 to-black" : "bg-linear-to-br from-neutral-900 via-neutral-950 to-black",
        exiting ? "animate-out fade-out fill-mode-forwards" : "animate-in fade-in",
      )}
    >
      {airing.audioUrl && (
        <audio
          ref={audioRef}
          src={airing.audioUrl}
          preload="auto"
          onEnded={finish}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      )}

      <div className="flex max-w-4xl flex-col items-center gap-7 px-8 text-center">
        <span className="relative grid size-28 place-items-center sm:size-32">
          <span
            className={cn(
              "absolute inset-0 rounded-full motion-safe:animate-ping",
              emergency ? "bg-red-500/30" : "bg-white/10",
            )}
          />
          <span
            className={cn(
              "relative grid size-full place-items-center rounded-full",
              emergency ? "bg-red-600 text-white" : "bg-white text-black",
            )}
          >
            <Icon className="size-12 sm:size-14" />
          </span>
        </span>

        <span
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-bold tracking-[0.2em] uppercase",
            emergency ? "bg-red-600 text-white" : "bg-white/10 text-white/80",
          )}
        >
          {emergency ? "Emergency" : categoryFromDb(airing.category) === "General" ? "Announcement" : categoryFromDb(airing.category)}
        </span>

        <div>
          <p className="text-4xl font-semibold text-balance text-white sm:text-6xl">{airing.title}</p>
          {airing.description && (
            <p className="mx-auto mt-4 line-clamp-3 max-w-2xl text-lg text-pretty text-white/65 sm:text-2xl">
              {airing.description}
            </p>
          )}
        </div>

        <Equalizer
          bars={6}
          playing={playing || failed}
          className="h-10"
          barClassName={cn("w-2", emergency ? "bg-red-400" : "bg-white/85")}
        />
      </div>

      {!soundOn && !failed && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-base font-semibold text-black shadow-2xl">
          <Volume2 className="size-5" />
          Tap for sound
        </div>
      )}

      <div className="pointer-events-none absolute top-5 right-5 rounded-full bg-black/50 px-3 py-1.5 font-mono text-sm text-white/80 tabular-nums backdrop-blur-sm sm:top-7 sm:right-7">
        {formatRemaining(remaining)}
      </div>
    </div>
  );
}
