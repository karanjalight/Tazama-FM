"use client";

import * as React from "react";
import { AlertTriangle, Mic, Square } from "lucide-react";

import { useAudioRecorder } from "./use-audio-recorder";
import { LiveWaveform } from "./waveform";
import { AudioPreview } from "./audio-preview";
import { VioletButton } from "@/components/business/branches/new/violet-button";

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioRecorder({
  onUse,
  onCancel,
}: {
  onUse: (input: { url: string; durationSeconds: number; blob: Blob | null }) => void;
  onCancel: () => void;
}) {
  const recorder = useAudioRecorder();

  if (recorder.status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 p-6 text-center">
        <AlertTriangle className="size-5 text-rose-400" />
        <p className="text-sm text-rose-300">{recorder.error}</p>
        <button type="button" onClick={onCancel} className="mt-1 text-sm font-medium text-foreground underline underline-offset-2">
          Back
        </button>
      </div>
    );
  }

  if (recorder.status === "stopped" && recorder.audioUrl) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Your Recording</p>
        <p className="mb-3 text-xs text-muted-foreground">{formatSeconds(recorder.seconds)} recorded</p>
        <AudioPreview src={recorder.audioUrl} durationLabel={formatSeconds(recorder.seconds)} />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={recorder.reset}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Re-record
          </button>
          <VioletButton
            type="button"
            onClick={() =>
              recorder.audioUrl &&
              onUse({ url: recorder.audioUrl, durationSeconds: recorder.seconds, blob: recorder.audioBlob })
            }
          >
            Use Recording
          </VioletButton>
        </div>
      </div>
    );
  }

  if (recorder.status === "recording" || recorder.status === "requesting") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Recording Announcement</p>
        <div className="flex items-center gap-2 text-rose-400">
          <span className="size-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wide">REC</span>
        </div>
        <p className="font-mono text-3xl font-bold text-foreground tabular-nums" aria-live="polite">
          {formatSeconds(recorder.seconds)}
        </p>
        <LiveWaveform analyser={recorder.analyser} className="w-full max-w-sm" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              recorder.reset();
              onCancel();
            }}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={recorder.stop}
            disabled={recorder.status === "requesting"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            <Square className="size-3.5" fill="currentColor" />
            Stop Recording
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-violet-500/15 text-violet-400">
        <Mic className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Record your voice directly in Tazama</p>
        <p className="text-xs text-muted-foreground">You&apos;ll be asked for microphone access.</p>
      </div>
      <VioletButton type="button" onClick={recorder.start}>
        Start Recording
      </VioletButton>
    </div>
  );
}
