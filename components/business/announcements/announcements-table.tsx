import { MoreVertical, Pause, Volume1 } from "lucide-react";

import { formatAnnouncementTimestamp, namesFor, screensFor, type Announcement, type AnnouncementTargetOptions } from "./mock-data";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: Announcement["status"] }) {
  const cls = status === "sent" ? "bg-emerald-500" : status === "scheduled" ? "bg-amber-500" : "bg-muted-foreground/50";
  const textCls = status === "sent" ? "text-emerald-400" : status === "scheduled" ? "text-amber-400" : "text-muted-foreground";
  const label = status === "sent" ? "Sent" : status === "scheduled" ? "Scheduled" : "Draft";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", textCls)}>
      <span className={cn("size-1.5 rounded-full", cls)} aria-hidden="true" />
      {label}
    </span>
  );
}

function PlaybackBadge({ announcement }: { announcement: Announcement }) {
  const isPause = announcement.playbackMode === "pause";
  const Icon = isPause ? Pause : Volume1;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
      <Icon className="size-3" />
      {isPause ? "Pause Music" : `Reduce to ${announcement.reducedVolumePercent}%`}
    </span>
  );
}

export function AnnouncementsTable({
  announcements,
  targetOptions,
  selectedId,
  onSelect,
}: {
  announcements: Announcement[];
  targetOptions: AnnouncementTargetOptions;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Announcement</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Duration</th>
            <th className="px-3 py-2.5 font-medium">Target</th>
            <th className="px-3 py-2.5 font-medium">Playback</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Sent/Scheduled</th>
            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((a) => {
            const selected = a.id === selectedId;
            const rooms = namesFor(a.target.roomIds, targetOptions.rooms);
            const deviceCount = screensFor(a.target.roomIds, targetOptions.rooms);
            const targetLabel = rooms.length > 0 ? rooms.join(", ") : a.target.locationIds.length > 0 ? "Multiple locations" : "No target";
            return (
              <tr
                key={a.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${a.title} details`}
                onClick={() => onSelect(a.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(a.id);
                  }
                }}
                className={cn(
                  "cursor-pointer border-t border-border transition-colors focus-visible:bg-muted/50 focus-visible:outline-none",
                  selected ? "bg-violet-500/8" : "hover:bg-muted/40",
                )}
                style={selected ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
              >
                <td className="px-3 py-2.5 font-medium text-foreground">{a.title}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{a.category}</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground">{a.duration}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {targetLabel}
                  {deviceCount > 0 && <span className="block text-xs">{deviceCount} screens</span>}
                </td>
                <td className="px-3 py-2.5">
                  <PlaybackBadge announcement={a} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill status={a.status} />
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{formatAnnouncementTimestamp(a)}</td>
                <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Actions for ${a.title}`}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {announcements.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No announcements match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
