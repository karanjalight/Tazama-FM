"use client";

import * as React from "react";

import { canUseMediaRecorder, pickSupportedMimeType } from "@/lib/voice/capabilities";

/** Configurable cap — recording auto-stops here rather than growing unbounded. */
export const MAX_VOICE_NOTE_MS = 2 * 60 * 1000;

export type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "stopped"
  | "unsupported"
  | "permission-denied"
  | "error";

export interface VoiceRecorderState {
  status: RecorderStatus;
  durationMs: number;
  previewUrl: string | null;
  blob: Blob | null;
  mimeType: string | null;
}

export interface VoiceRecorderControls {
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
}

/**
 * Records a voice note via MediaRecorder. Mic permission is requested only
 * when `start()` is called (never on mount/hover). Owns cleanup of every
 * resource it creates — MediaRecorder, MediaStream tracks, the duration
 * timer, and the preview object URL — both on cancel/reset and on unmount,
 * so a mid-recording navigation can't leave the microphone active.
 */
export function useVoiceRecorder(): VoiceRecorderState & VoiceRecorderControls {
  const [status, setStatus] = React.useState<RecorderStatus>(
    canUseMediaRecorder() ? "idle" : "unsupported",
  );
  const [durationMs, setDurationMs] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [mimeType, setMimeType] = React.useState<string | null>(null);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const startedAtRef = React.useRef(0);
  const intervalRef = React.useRef<number | null>(null);

  const stopTimer = React.useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopTracks = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokePreview = React.useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const reset = React.useCallback(() => {
    stopTimer();
    stopTracks();
    revokePreview();
    recorderRef.current = null;
    chunksRef.current = [];
    setBlob(null);
    setMimeType(null);
    setDurationMs(0);
    setStatus(canUseMediaRecorder() ? "idle" : "unsupported");
  }, [revokePreview, stopTimer, stopTracks]);

  const cancel = React.useCallback(() => {
    // Detach onstop first so the in-flight stop doesn't finalize a blob
    // we're about to throw away.
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    reset();
  }, [reset]);

  const start = React.useCallback(async () => {
    if (!canUseMediaRecorder()) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting-permission");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("permission-denied");
      return;
    }

    const type = pickSupportedMimeType();
    if (!type) {
      stream.getTracks().forEach((track) => track.stop());
      setStatus("unsupported");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    setMimeType(type);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: type });
    } catch {
      stopTracks();
      setStatus("error");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stopTimer();
      const finalBlob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      stopTracks();
      setBlob(finalBlob);
      setPreviewUrl(URL.createObjectURL(finalBlob));
      setStatus("stopped");
    };
    recorder.onerror = () => {
      stopTimer();
      stopTracks();
      setStatus("error");
    };

    startedAtRef.current = Date.now();
    setDurationMs(0);
    recorder.start();
    setStatus("recording");

    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setDurationMs(elapsed);
      if (elapsed >= MAX_VOICE_NOTE_MS) {
        recorderRef.current?.stop();
      }
    }, 200);
  }, [stopTimer, stopTracks]);

  const stop = React.useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  React.useEffect(() => {
    return () => {
      stopTimer();
      stopTracks();
      revokePreview();
    };
    // Cleanup-only effect — intentionally runs its teardown just once, on
    // unmount, referencing the callbacks (which are themselves stable refs
    // under the hood) rather than any per-render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, durationMs, previewUrl, blob, mimeType, start, stop, cancel, reset };
}
