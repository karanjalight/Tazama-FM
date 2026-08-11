"use client";

import * as React from "react";
import { Check, Loader2, Mic, Pause, Play, Trash2, X } from "lucide-react";

import { useVoiceRecorder, MAX_VOICE_NOTE_MS } from "@/lib/voice/use-voice-recorder";
import { cn } from "@/lib/utils";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Replaces the composer's normal row while recording/previewing a voice
 * note. Starts recording immediately on mount (the composer's own mic
 * button is the "start" gesture — this component's job begins there) and
 * always calls `onClose` on the way out, whether that's a cancel or a
 * successful send, so the parent knows to go back to the normal composer.
 */
export function VoiceRecorder({
  onSend,
  onClose,
}: {
  onSend: (blob: Blob, mimeType: string, durationMs: number) => Promise<void>;
  onClose: () => void;
}) {
  const recorder = useVoiceRecorder();
  const [sending, setSending] = React.useState(false);
  const [previewPlaying, setPreviewPlaying] = React.useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const startedRef = React.useRef(false);
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recorder.start();
  }, [recorder]);

  function handleCancel() {
    previewAudioRef.current?.pause();
    recorder.cancel();
    onClose();
  }

  async function handleSend() {
    if (!recorder.blob || !recorder.mimeType || sending) return;
    setSending(true);
    try {
      await onSend(recorder.blob, recorder.mimeType, recorder.durationMs);
      onClose();
    } finally {
      setSending(false);
    }
  }

  function togglePreview() {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) audio.pause();
    else void audio.play();
  }

  if (recorder.status === "unsupported") {
    return (
      <ErrorRow
        message="Voice notes aren't supported in this browser."
        onClose={onClose}
      />
    );
  }
  if (recorder.status === "permission-denied") {
    return (
      <ErrorRow
        message="Microphone access was denied. Allow it in your browser settings to record a voice note."
        onClose={onClose}
      />
    );
  }
  if (recorder.status === "error") {
    return <ErrorRow message="Couldn't start recording. Try again." onClose={onClose} />;
  }

  if (recorder.status === "requesting-permission") {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Requesting microphone access…
      </div>
    );
  }

  if (recorder.status === "recording") {
    const nearCap = recorder.durationMs > MAX_VOICE_NOTE_MS - 10_000;
    return (
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel recording"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-4.5" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-brand animate-live-ping" />
            <span className="relative size-2.5 rounded-full bg-brand" />
          </span>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              nearCap ? "text-brand" : "text-foreground",
            )}
          >
            {formatDuration(recorder.durationMs)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {formatDuration(MAX_VOICE_NOTE_MS)}
          </span>
        </div>
        <button
          type="button"
          onClick={recorder.stop}
          aria-label="Stop recording"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
        >
          <Check className="size-4.5" />
        </button>
      </div>
    );
  }

  if (recorder.status === "stopped" && recorder.previewUrl) {
    return (
      <div className="flex items-center gap-3 p-3">
        <audio
          ref={previewAudioRef}
          src={recorder.previewUrl}
          onPlay={() => setPreviewPlaying(true)}
          onPause={() => setPreviewPlaying(false)}
          onEnded={() => setPreviewPlaying(false)}
        />
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Discard recording"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-4.5" />
        </button>
        <button
          type="button"
          onClick={togglePreview}
          aria-label={previewPlaying ? "Pause preview" : "Play preview"}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground hover:bg-muted/70"
        >
          {previewPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 translate-x-px fill-current" />
          )}
        </button>
        <span className="flex-1 font-mono text-sm tabular-nums text-foreground">
          {formatDuration(recorder.durationMs)}
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          aria-label="Send voice note"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>
      </div>
    );
  }

  // "idle" — the composer never actually renders us in this state (it
  // switches to VoiceRecorder only once recording has been triggered), but
  // handle it defensively rather than rendering nothing on a stray render.
  return null;
}

function ErrorRow({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <p className="flex-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4.5" />
      </button>
    </div>
  );
}
