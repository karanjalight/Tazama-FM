"use client";

import * as React from "react";
import { Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";

import {
  namesFor,
  screensFor,
  formatAnnouncementTimestamp,
  type Announcement,
  type AnnouncementTargetOptions,
} from "./mock-data";
import { AudioPreview } from "./audio-preview";
import { PlaybackFlowDiagram } from "./playback-flow-diagram";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function StatusPill({ status }: { status: Announcement["status"] }) {
  const cls = status === "sent" ? "bg-emerald-500" : status === "scheduled" ? "bg-amber-500" : "bg-muted-foreground/50";
  const textCls = status === "sent" ? "text-emerald-400" : status === "scheduled" ? "text-amber-400" : "text-muted-foreground";
  const label = status === "sent" ? "Sent" : status === "scheduled" ? "Scheduled" : "Draft";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textCls}`}>
      <span className={`size-1.5 rounded-full ${cls}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-4 first:border-t-0">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

export function AnnouncementDetailDrawer({
  announcement,
  targetOptions,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  announcement: Announcement | null;
  targetOptions: AnnouncementTargetOptions;
  onOpenChange: (open: boolean) => void;
  onEdit: (a: Announcement) => void;
  onDuplicate: (a: Announcement) => void;
  onDelete: (id: string) => void;
}) {
  const [replayKey, setReplayKey] = React.useState(0);

  return (
    <Sheet open={!!announcement} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" side="right">
        {announcement && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{announcement.title}</SheetTitle>
              <SheetDescription className="sr-only">Announcement details</SheetDescription>
              <StatusPill status={announcement.status} />
            </SheetHeader>

            <div className="px-4">
              <div className="flex items-center gap-2 pb-4">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{announcement.category}</span>
                <span className="font-mono text-xs text-muted-foreground">{announcement.duration}</span>
              </div>

              <Section title="Audio">
                <AudioPreview key={replayKey} src={announcement.audioUrl} durationLabel={announcement.duration} />
              </Section>

              <Section title="Target">
                <div className="space-y-1 text-sm text-foreground">
                  {namesFor(announcement.target.locationIds, targetOptions.locations).map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                  {namesFor(announcement.target.roomIds, targetOptions.rooms).map((n) => (
                    <p key={n} className="text-muted-foreground">
                      {n}
                    </p>
                  ))}
                  {namesFor(announcement.target.audioZoneIds, targetOptions.audioZones).map((n) => (
                    <p key={n} className="text-muted-foreground">
                      {n}
                    </p>
                  ))}
                  <p className="pt-1 font-medium text-foreground">
                    {screensFor(announcement.target.roomIds, targetOptions.rooms)} devices
                  </p>
                </div>
              </Section>

              <Section title="Playback">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {announcement.playbackMode === "pause" ? "Pause Music" : `Reduce Volume (${announcement.reducedVolumePercent}%)`}
                </p>
                <PlaybackFlowDiagram mode={announcement.playbackMode} volumePercent={announcement.reducedVolumePercent} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {announcement.playbackMode === "pause"
                    ? "Music resumes automatically after playback."
                    : "Volume returns to normal automatically after playback."}
                </p>
              </Section>

              <Section title={announcement.status === "scheduled" ? "Next Playback" : "Sent"}>
                <p className="text-sm text-foreground">{formatAnnouncementTimestamp(announcement)}</p>
                {announcement.sentBy && <p className="text-xs text-muted-foreground">By {announcement.sentBy}</p>}
                {announcement.repeatLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">Repeats: {announcement.repeatLabel}</p>
                )}
              </Section>

              <Section title="Actions">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplayKey((k) => k + 1)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <RotateCcw className="size-3.5" />
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(announcement)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Copy className="size-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(announcement)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(announcement.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
