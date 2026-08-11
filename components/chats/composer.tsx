"use client";

import * as React from "react";
import { Music, Send } from "lucide-react";

import { TrackPicker } from "@/components/chats/track-picker";
import type { SharedTrack } from "@/lib/chats/types";

export function Composer({
  onSend,
  onShareTrack,
}: {
  onSend: (body: string) => void;
  onShareTrack: (track: SharedTrack) => void;
}) {
  const [value, setValue] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
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
      <button
        type="button"
        onClick={submit}
        aria-label="Send"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
      >
        <Send className="size-4" />
      </button>
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
