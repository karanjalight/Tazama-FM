"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

export function AudioUploader({
  onUse,
}: {
  onUse: (input: { url: string; durationSeconds: number; fileName: string; file: File }) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Audio(url);
    probe.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0;
      onUse({ url, durationSeconds: duration, fileName: file.name, file });
    });
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
      }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-violet-500/15 text-violet-400">
        <UploadCloud className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Upload an existing voice recording</p>
        <p className="text-xs text-muted-foreground">MP3, WAV or M4A · or drag and drop</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Choose File
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
