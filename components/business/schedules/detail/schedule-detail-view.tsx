"use client";

import * as React from "react";
import type * as ReactType from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import {
  ChevronRight,
  Trash2,
  Pencil,
  Music,
  Image as ImageIcon,
  FileText,
  Video,
} from "lucide-react";

import type { Schedule, ScheduleSession } from "@/lib/business/schedule-types";
import type { ContentItem, Playlist } from "@/lib/business/content-queries";
import { createSession, type ScheduleSession as ClientSession } from "@/components/business/schedules/new/schedule-state";
import { toClientSession, toSessionInput } from "./session-convert";
import { ContentPreviewDialog } from "./content-preview-dialog";
import { NowPlayingCard } from "./now-playing-card";
import {
  deleteSchedule,
  setScheduleStatus,
  updateSchedule,
  replaceScheduleSessions,
} from "@/app/business/schedules/actions";
import { playlistDurationSummary, contentDurationSummary, formatDurationSeconds } from "@/lib/business/schedule-duration";
import { SessionContentDialog } from "@/components/business/schedules/new/steps/session-content-dialog";
import { DayTimeline } from "@/components/business/schedules/new/steps/day-timeline";
import { formatTimeLabel } from "@/components/business/schedules/new/steps/session-utils";
import { Switch } from "@/components/ui/switch";
import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Music, document: FileText } as const;

function SessionCard({
  branchId,
  session,
  onPreview,
  onEdit,
}: {
  branchId: string;
  session: ScheduleSession;
  onPreview: (item: ContentItem) => void;
  onEdit: (session: ScheduleSession) => void;
}) {
  void branchId;
  const playlist = playlistDurationSummary({
    startTime: session.startTime,
    endTime: session.endTime,
    playlistEnabled: session.playlistEnabled,
    songs: session.songs.map((s) => ({ durationSeconds: s.track.durationSeconds })),
  });
  const content = contentDurationSummary({
    startTime: session.startTime,
    endTime: session.endTime,
    contentEnabled: session.contentEnabled,
    contentRepeat: session.contentRepeat,
    content: session.content.map((c) => ({ durationSeconds: c.displaySeconds ?? c.item.durationSeconds })),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{session.label}</p>
          <p className="text-xs text-muted-foreground">
            {session.startTime} – {session.endTime}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(session)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
      </div>

      {session.playlistEnabled && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Playlist</p>
            <span
              className={cn(
                "text-xs font-medium",
                playlist.status === "short" ? "text-rose-400" : playlist.status === "over" ? "text-amber-400" : "text-emerald-400",
              )}
            >
              {formatDurationSeconds(playlist.scheduledSeconds)} / {formatDurationSeconds(playlist.windowSeconds)} scheduled
            </span>
          </div>
          {session.songs.length > 0 ? (
            <ol className="mt-2 space-y-1">
              {session.songs.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2.5 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                  <Cover title={s.track.title} src={s.track.thumbnailUrl ?? undefined} sizes="36px" className="size-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{s.track.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.track.artist ?? "Unknown"}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {s.track.durationSeconds != null ? formatDurationSeconds(s.track.durationSeconds) : "—"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No songs yet.</p>
          )}
        </div>
      )}

      {session.contentEnabled && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Content</p>
            {content.requiredSeconds !== null && (
              <span
                className={cn(
                  "text-xs font-medium",
                  content.status === "short" ? "text-rose-400" : content.status === "over" ? "text-amber-400" : "text-emerald-400",
                )}
              >
                {formatDurationSeconds(content.scheduledSeconds)} / {formatDurationSeconds(content.windowSeconds)} scheduled
              </span>
            )}
          </div>
          {session.content.length > 0 ? (
            <ol className="mt-2 space-y-1.5">
              {session.content.map((c, i) => {
                const Icon = TYPE_ICON[c.item.contentType];
                const seconds = c.displaySeconds ?? c.item.durationSeconds;
                return (
                  <li key={c.id} className="flex items-center gap-2.5">
                    <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => onPreview(c.item)}
                      className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted"
                    >
                      {c.item.previewUrl ? (
                        <Image src={c.item.previewUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                      ) : (
                        <Icon className="m-auto size-4 text-muted-foreground" />
                      )}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{c.item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {seconds != null ? formatDurationSeconds(seconds) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No content yet.</p>
          )}
        </div>
      )}

      {!session.playlistEnabled && !session.contentEnabled && !session.adsEnabled && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Nothing configured — falls back to background music.
        </p>
      )}
    </div>
  );
}

export function ScheduleDetailView({
  branchId,
  branchSlugOrId,
  schedule,
  businessContent,
  businessAds,
  businessPlaylists,
  initialContentRecheckInSeconds,
}: {
  branchId: string;
  branchSlugOrId: string;
  schedule: Schedule;
  businessContent: ContentItem[];
  businessAds: ContentItem[];
  businessPlaylists: Playlist[];
  initialContentRecheckInSeconds: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [previewItem, setPreviewItem] = React.useState<ContentItem | null>(null);
  const [editingSession, setEditingSession] = React.useState<ClientSession | null>(null);
  const schedulesHref = `/business/branches/${branchSlugOrId}/schedules`;
  const clientSessions = React.useMemo(() => schedule.sessions.map(toClientSession), [schedule.sessions]);

  async function toggleActive() {
    setPending(true);
    const nextStatus = schedule.status === "active" ? "paused" : "active";
    const res = await setScheduleStatus({ branchId, id: schedule.id, status: nextStatus });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(nextStatus === "active" ? "Schedule activated" : "Schedule deactivated");
    router.refresh();
  }

  async function toggleSync(next: boolean) {
    const res = await updateSchedule({ branchId, id: schedule.id, synchronizedPlayback: next });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${schedule.name}"? This can't be undone.`)) return;
    const res = await deleteSchedule({ branchId, id: schedule.id });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Schedule deleted");
    router.push(schedulesHref);
  }

  async function saveSession(updated: ClientSession) {
    // A block created by clicking/dragging an empty timeline gap (see
    // handleCreateBlock) has an id that doesn't exist in schedule.sessions
    // yet — append rather than (no-op) map-replace, or it would silently
    // never make it into the saved schedule.
    const exists = schedule.sessions.some((s) => s.id === updated.id);
    const nextSessions = exists
      ? clientSessions.map((s) => (s.id === updated.id ? updated : s))
      : [...clientSessions, updated];
    const res = await replaceScheduleSessions({ branchId, scheduleId: schedule.id, sessions: nextSessions.map(toSessionInput) });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    res.warnings.forEach((w) => toast.warning(w));
    toast.success("Session updated");
    setEditingSession(null);
    router.refresh();
  }

  /** A click/drag on an empty timeline gap — same "draft until saved" flow
   * as the wizard's own handleCreateBlock: opens straight into content
   * configuration, and isn't persisted at all unless the dialog is saved. */
  function handleCreateBlock(range: { startTime: string; endTime: string }) {
    const draft = createSession({ label: `Signage ${formatTimeLabel(range.startTime)}`, startTime: range.startTime, endTime: range.endTime, transition: "fade" });
    draft.contentEnabled = true;
    setEditingSession(draft);
  }

  /** A drag-move or drag-resize on an existing timeline block — commits
   * immediately (this is a live, already-saved schedule, unlike the
   * wizard's in-memory draft), through the same replaceScheduleSessions
   * round-trip every other session edit here already uses.
   */
  async function handleMoveOrResize(sessionId: string, range: { startTime: string; endTime: string }) {
    const nextSessions = clientSessions.map((s) => (s.id === sessionId ? { ...s, ...range } : s));
    const res = await replaceScheduleSessions({ branchId, scheduleId: schedule.id, sessions: nextSessions.map(toSessionInput) });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    res.warnings.forEach((w) => toast.warning(w));
    router.refresh();
  }

  const canControlLive = schedule.status === "active" && schedule.synchronizedPlayback;

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/business/branches" className="hover:text-foreground">
          Locations
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={schedulesHref} className="hover:text-foreground">
          Schedules
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{schedule.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{schedule.name}</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                schedule.status === "active"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : schedule.status === "paused"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {schedule.status}
            </span>
          </div>
          {schedule.description && <p className="mt-1 text-sm text-muted-foreground">{schedule.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {[...schedule.branchNames, ...schedule.roomNames].join(", ") || "No target selected"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            aria-label="Delete schedule"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
              schedule.status === "active" ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-violet-600 text-white hover:bg-violet-500",
            )}
          >
            {schedule.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </header>

      <label
        className="flex w-fit items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3"
        style={{ "--switch-accent": "var(--color-violet-600)" } as ReactType.CSSProperties}
      >
        <Switch checked={schedule.synchronizedPlayback} onCheckedChange={toggleSync} />
        <span className="text-sm text-foreground">Synchronized playback</span>
      </label>

      <NowPlayingCard
        branchId={branchId}
        scheduleId={schedule.id}
        scheduleActive={schedule.status === "active"}
        canControl={canControlLive}
        initialTrack={schedule.playback?.track ?? null}
        initialIsPlaying={schedule.playback?.isPlaying ?? false}
        initialContent={schedule.playback?.content ?? null}
        initialContentRecheckInSeconds={initialContentRecheckInSeconds}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Day Schedule</h2>
        <p className="text-xs text-muted-foreground">
          Click or drag an empty gap below to place signage content, drag a block to move it, or drag its edge to resize it.
        </p>
        <DayTimeline
          sessions={clientSessions}
          onSessionClick={setEditingSession}
          onCreateBlock={handleCreateBlock}
          onMoveOrResize={handleMoveOrResize}
        />
        {schedule.sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No sessions configured yet.
          </p>
        ) : (
          schedule.sessions.map((session) => (
            <SessionCard
              key={session.id}
              branchId={branchId}
              session={session}
              onPreview={setPreviewItem}
              onEdit={(s) => setEditingSession(toClientSession(s))}
            />
          ))
        )}
      </div>

      <ContentPreviewDialog item={previewItem} onOpenChange={(open) => !open && setPreviewItem(null)} />

      {editingSession && (
        <SessionContentDialog
          key={editingSession.id}
          session={editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
          onSave={saveSession}
          businessContent={businessContent}
          businessAds={businessAds}
          businessPlaylists={businessPlaylists}
        />
      )}
    </div>
  );
}
