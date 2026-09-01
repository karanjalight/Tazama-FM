"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  Gauge,
  ListMusic,
  Music,
  Pencil,
  Power,
  Speaker,
  Trash2,
  Volume2,
  X,
} from "lucide-react";

import { scheduleLabel, type AudioZone } from "@/lib/business/audio-zone-types";
import { updateAudioZone, deleteAudioZone } from "@/app/business/audio-zones/actions";
import { AddAudioZoneDialog, type AudioZoneOption } from "./add-audio-zone-dialog";
import { ICON_COLORS } from "./ui-constants";
import { cn } from "@/lib/utils";

const ICON_BG: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-400",
  amber: "bg-amber-500/15 text-amber-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  blue: "bg-blue-500/15 text-blue-400",
  pink: "bg-pink-500/15 text-pink-400",
};

const TABS = ["Overview", "Schedule", "Speakers", "Settings"] as const;
type Tab = (typeof TABS)[number];

function MiniStat({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <p className={cn("mt-1 font-mono text-sm font-semibold text-foreground", valueClassName)}>{value}</p>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function AudioZoneDetailPanel({
  zone,
  index,
  branchId,
  zoneOptions,
  roomOptions,
  playlistOptions,
  onClose,
}: {
  zone: AudioZone;
  index: number;
  branchId: string;
  zoneOptions: AudioZoneOption[];
  roomOptions: AudioZoneOption[];
  playlistOptions: AudioZoneOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [volume, setVolume] = React.useState(zone.volume);
  const [togglingStatus, setTogglingStatus] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const color = ICON_COLORS[index % ICON_COLORS.length];
  const active = zone.status === "active";

  async function commitVolume(next: number) {
    if (next === zone.volume) return;
    const res = await updateAudioZone({ branchId, id: zone.id, volume: next });
    if (!res.ok) {
      toast.error(res.error);
      setVolume(zone.volume);
      return;
    }
    router.refresh();
  }

  async function handleToggleStatus() {
    setTogglingStatus(true);
    const res = await updateAudioZone({ branchId, id: zone.id, status: active ? "inactive" : "active" });
    setTogglingStatus(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(active ? "Audio zone deactivated." : "Audio zone activated.");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${zone.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await deleteAudioZone({ branchId, id: zone.id });
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Audio zone deleted.");
    onClose();
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", ICON_BG[color])}>
            <Volume2 className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{zone.name}</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  active ? "text-emerald-400" : "text-muted-foreground",
                )}
              >
                <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                {active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{zone.description || "No description"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{zone.zoneName ? `${zone.zoneName} Zone` : "No physical zone assigned"}</p>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{zone.roomNames.length} room{zone.roomNames.length === 1 ? "" : "s"}</span>
        <span>{zone.speakersTotal} Speakers</span>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-4 space-y-4">
          {zone.defaultPlaylistName ? (
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500/25 to-fuchsia-500/25 text-foreground">
                <Music className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{zone.defaultPlaylistName}</p>
                <p className="text-xs text-muted-foreground">Default playlist</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No default playlist set
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Volume2 className="size-3.5" />
                Volume
              </span>
              <span className="font-mono text-foreground">{volume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onMouseUp={(e) => commitVolume(Number(e.currentTarget.value))}
              onTouchEnd={(e) => commitVolume(Number(e.currentTarget.value))}
              onKeyUp={(e) => commitVolume(Number(e.currentTarget.value))}
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-violet-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat icon={Power} label="Status" value={active ? "Active" : "Inactive"} valueClassName={active ? "text-emerald-400" : undefined} />
            <MiniStat icon={Speaker} label="Speakers" value={`${zone.speakersOnline}/${zone.speakersTotal} online`} />
            <MiniStat icon={Gauge} label="Volume Limit" value={`${zone.volumeLimit}%`} />
            <MiniStat icon={Clock} label="Schedule" value={scheduleLabel(zone)} />
          </div>

          <div className="flex gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50",
                active ? "bg-brand-strong hover:bg-[#a82420]" : "bg-emerald-600 hover:bg-emerald-500",
              )}
            >
              {active ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete audio zone"
              className="inline-flex items-center justify-center rounded-xl border border-input px-3 text-rose-400 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {tab === "Schedule" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <Clock className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-lg font-semibold text-foreground">{scheduleLabel(zone)}</p>
            <p className="text-xs text-muted-foreground">
              {zone.scheduleStart && zone.scheduleEnd
                ? "This audio zone only plays during this window each day."
                : "This audio zone plays all day."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="w-full rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Edit Schedule
          </button>
        </div>
      )}

      {tab === "Speakers" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat icon={Speaker} label="Total Speakers" value={zone.speakersTotal} />
            <MiniStat icon={Speaker} label="Online" value={zone.speakersOnline} valueClassName="text-emerald-400" />
          </div>
          {zone.roomNames.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Covered Rooms
              </p>
              <ul className="space-y-1">
                {zone.roomNames.map((name) => (
                  <li key={name} className="rounded-lg bg-muted/30 px-3 py-2 text-sm text-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No rooms covered yet
            </div>
          )}
        </div>
      )}

      {tab === "Settings" && (
        <div className="mt-4 space-y-1">
          <SettingsRow label="Default Playlist" value={zone.defaultPlaylistName ?? "None"} />
          <SettingsRow label="Volume Limit" value={`${zone.volumeLimit}%`} />
          <SettingsRow label="Crossfade" value={`${zone.crossfadeSeconds} seconds`} />
          <SettingsRow label="Audio Ducking" value={zone.audioDuckingEnabled ? "Enabled" : "Disabled"} />
          <SettingsRow label="Announcements" value={zone.announcementsEnabled ? "Enabled" : "Disabled"} />
          <SettingsRow label="Physical Zone" value={zone.zoneName ?? "None"} />
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ListMusic className="size-3.5" />
            Edit Settings
          </button>
        </div>
      )}

      <AddAudioZoneDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        branchId={branchId}
        zoneOptions={zoneOptions}
        roomOptions={roomOptions}
        playlistOptions={playlistOptions}
        editingZone={zone}
      />
    </div>
  );
}
