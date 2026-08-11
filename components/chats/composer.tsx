"use client";

import * as React from "react";
import { Mic, Music, Send } from "lucide-react";

import { TrackPicker } from "@/components/chats/track-picker";
import { VoiceRecorder } from "@/components/voice/voice-recorder";
import type { SharedTrack } from "@/lib/chats/types";

export function Composer({
  onSend,
  onShareTrack,
  onSendVoice,
}: {
  onSend: (body: string) => void;
  onShareTrack: (track: SharedTrack) => void;
  onSendVoice: (blob: Blob, mimeType: string, durationMs: number) => Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  if (recording) {
    return (
      <div className="border-t border-border bg-background">
        <VoiceRecorder onSend={onSendVoice} onClose={() => setRecording(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-border bg-background p-3">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Share a track"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Music className="size-4.5" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()}
        placeholder="Message…"
        className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-brand"
      />
      {value.trim() ? (
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
        >
          <Send className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setRecording(true)}
          aria-label="Record a voice note"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Mic className="size-4.5" />
        </button>
      )}
      {pickerOpen && (
        <TrackPicker
          onClose={() => setPickerOpen(false)}
          onPick={(track) => {
            onShareTrack(track);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
