"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Mic, Pause, UploadCloud, Volume1 } from "lucide-react";

import type { AnnouncementTargetOptions, PlaybackMode } from "../mock-data";
import { createAnnouncement } from "@/app/business/announcements/actions";
import { buildAnnouncementFormData } from "./announcement-draft";
import { useAudioRecorder } from "../use-audio-recorder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The <30-second path: hold to record (or upload), pick a room, pick a playback mode, send. No steps, no assistant. */
export function QuickAnnouncementDialog({
  open,
  onOpenChange,
  targetOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOptions: AnnouncementTargetOptions;
}) {
  const router = useRouter();
  const recorder = useAudioRecorder();
  const [uploaded, setUploaded] = React.useState<{ url: string; durationSeconds: number; file: File } | null>(null);
  const [roomId, setRoomId] = React.useState(targetOptions.rooms[0]?.id ?? "");
  const [mode, setMode] = React.useState<PlaybackMode>("pause");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const uploadRef = React.useRef<HTMLInputElement>(null);

  const roomNamesById = new Map(targetOptions.rooms.map((r) => [r.id, r.name]));
  const audioUrl = uploaded?.url ?? (recorder.status === "stopped" ? recorder.audioUrl : null);
  const durationSeconds = uploaded?.durationSeconds ?? recorder.seconds;
  const audioFile: Blob | null = uploaded?.file ?? recorder.audioBlob;

  function reset() {
    recorder.reset();
    setUploaded(null);
    setRoomId(targetOptions.rooms[0]?.id ?? "");
    setMode("pause");
    setSent(false);
  }

  function handleUpload(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Audio(url);
    probe.addEventListener("loadedmetadata", () => {
      setUploaded({ url, durationSeconds: Number.isFinite(probe.duration) ? Math.round(probe.duration) : 5, file });
    });
  }

  async function send() {
    if (!roomId || !audioFile) return;
    const roomName = roomNamesById.get(roomId) ?? "Selected Room";
    setSending(true);
    const formData = buildAnnouncementFormData({
      title: `Quick Announcement — ${roomName}`,
      category: "General",
      description: "",
      durationSeconds: durationSeconds || 5,
      target: { locationIds: [], zoneIds: [], roomIds: [roomId], audioZoneIds: [] },
      playbackMode: mode,
      reducedVolumePercent: 20,
      repeat: "none",
      sendMode: "now",
      scheduleDate: "",
      scheduleTime: "16:00",
      audioFile,
    });
    const result = await createAnnouncement(formData);
    setSending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Quick Announcement — ${roomName} sent`, { description: `Now playing in ${roomName}.` });
    setSent(true);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="size-6" strokeWidth={2.5} />
            </span>
            <p className="text-sm font-semibold text-foreground">Announcement sent</p>
            <VioletButton type="button" onClick={() => onOpenChange(false)} className="mt-1">
              Done
            </VioletButton>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Quick Announcement</DialogTitle>
              <DialogDescription>Hold to record, pick where, and send.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {audioUrl ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  <span>Audio ready ({formatSeconds(durationSeconds)})</span>
                  <button type="button" onClick={reset} className="underline underline-offset-2">
                    Redo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onMouseDown={recorder.start}
                    onMouseUp={recorder.stop}
                    onMouseLeave={() => recorder.status === "recording" && recorder.stop()}
                    onTouchStart={recorder.start}
                    onTouchEnd={recorder.stop}
                    className={cn(
                      "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-colors select-none",
                      recorder.status === "recording" ? "border-rose-500 bg-rose-500/10" : "border-input hover:bg-muted/40",
                    )}
                  >
                    <Mic className={cn("size-6", recorder.status === "recording" ? "text-rose-400" : "text-violet-400")} />
                    <span className="text-sm font-medium text-foreground">
                      {recorder.status === "recording" ? `Recording… ${formatSeconds(recorder.seconds)}` : "Hold to Record"}
                    </span>
                  </button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2"
                  >
                    <UploadCloud className="size-3.5" />
                    Upload Audio
                  </button>
                  <input ref={uploadRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                  {recorder.error && <p className="text-xs text-rose-400">{recorder.error}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Where?</p>
                {targetOptions.rooms.length > 0 ? (
                  <Select
                    value={roomNamesById.get(roomId) ?? ""}
                    onValueChange={(name) => {
                      const found = targetOptions.rooms.find((r) => r.name === name);
                      if (found) setRoomId(found.id);
                    }}
                    items={targetOptions.rooms.map((r) => r.name)}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">No rooms configured yet for this business.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">How?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("pause")}
                    className={cn(
                      "flex flex-1 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm",
                      mode === "pause" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
                    )}
                  >
                    <Pause className="size-3.5" />
                    Pause Music
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("reduce")}
                    className={cn(
                      "flex flex-1 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm",
                      mode === "reduce" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
                    )}
                  >
                    <Volume1 className="size-3.5" />
                    Reduce Volume
                  </button>
                </div>
              </div>

              <VioletButton
                type="button"
                onClick={() => void send()}
                disabled={!audioFile || !roomId || sending}
                className="w-full justify-center"
              >
                {sending ? "Sending…" : "Send Now"}
              </VioletButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
