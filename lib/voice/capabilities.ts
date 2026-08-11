"use client";

/**
 * Capability detection for voice notes. Two of these are real, static
 * feature checks; the third (background playback) genuinely cannot be
 * pre-checked — no browser API tells you in advance whether an autoplay
 * attempt will be allowed. The only correct way to know is to attempt
 * `audio.play()` and read whether the returned promise resolves or rejects.
 * `canBackgroundPlayVoice()` here reflects the outcome of the *last* such
 * attempt, recorded by whichever code actually tried to play — it's a
 * "how did it go last time" signal, not a prediction.
 */

export function canUseMediaRecorder(): boolean {
  return (
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function canSendNotifications(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export function notificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export type BackgroundPlaybackOutcome = "unknown" | "allowed" | "blocked";

const STORAGE_KEY = "tz.voice.bg-playback-outcome";

/** Called by the code that actually attempted playback, right after the attempt. */
export function recordBackgroundPlaybackOutcome(outcome: BackgroundPlaybackOutcome): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, outcome);
  } catch {
    /* storage full/blocked — the outcome just won't persist across reloads */
  }
}

/** Best-known answer to "did the last background autoplay attempt succeed?". */
export function canBackgroundPlayVoice(): BackgroundPlaybackOutcome {
  if (typeof window === "undefined") return "unknown";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "allowed" || stored === "blocked") return stored;
  } catch {
    /* ignore — falls through to "unknown" */
  }
  return "unknown";
}

/** MIME types in preference order — the first one MediaRecorder actually supports wins. */
const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

/** Detect a MediaRecorder-supported audio MIME type, or null if none are (or MediaRecorder is unsupported). */
export function pickSupportedMimeType(): string | null {
  if (!canUseMediaRecorder() || typeof MediaRecorder.isTypeSupported !== "function") {
    return null;
  }
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}
