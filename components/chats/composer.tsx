"use client";

import * as React from "react";
import { Send } from "lucide-react";

export function Composer({
  onSend,
}: {
  onSend: (body: string) => void;
}) {
  const [value, setValue] = React.useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
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
    </div>
  );
}
