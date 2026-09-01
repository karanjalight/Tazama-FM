"use client";

import * as React from "react";
import {
  ArrowRight,
  DoorOpen,
  LayoutGrid,
  MonitorPlay,
  Pencil,
  Store,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";

import type { Zone, Room } from "@/lib/business/locations-queries";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export interface ZoneUpdateInput {
  name?: string;
  description?: string | null;
  activeHoursStart?: string | null;
  activeHoursEnd?: string | null;
}

export interface RoomUpdateInput {
  name?: string;
  zoneId?: string;
  roomType?: string | null;
  capacity?: number | null;
  tag?: string | null;
  description?: string | null;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <p className="mt-1.5 font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sublabel && <p className="text-[11px] text-emerald-400">{sublabel}</p>}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

function Hero({
  icon: Icon,
  gradient,
  editLabel,
  onEdit,
}: {
  icon: React.ElementType;
  gradient: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className={cn("relative flex h-32 items-start justify-end p-3", gradient)}>
      <span className="absolute inset-0 -z-10 bg-muted" />
      <Icon className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-foreground/10" />
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background/90"
      >
        <Pencil className="size-3" />
        {editLabel}
      </button>
    </div>
  );
}

function formatHours(start: string | null, end: string | null): string {
  if (!start || !end) return "All day";
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}

export function ZoneDetailPanel({
  zone,
  rooms,
  onViewRooms,
  onUpdate,
  onDelete,
  pending,
}: {
  zone: Zone;
  rooms: Room[];
  onViewRooms: () => void;
  onUpdate: (patch: ZoneUpdateInput) => void | Promise<void>;
  onDelete: () => void;
  pending: boolean;
}) {
  const zoneRooms = rooms.filter((r) => r.zoneId === zone.id);
  const capacity = zoneRooms.reduce((sum, r) => sum + (r.capacity ?? 0), 0);

  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(zone.name);
  const [description, setDescription] = React.useState(zone.description ?? "");
  const [hoursStart, setHoursStart] = React.useState(zone.activeHoursStart ?? "");
  const [hoursEnd, setHoursEnd] = React.useState(zone.activeHoursEnd ?? "");

  // Reset the edit draft whenever a different zone is selected, so stale
  // edits from the previously-selected zone never leak into this one.
  const [lastZoneId, setLastZoneId] = React.useState(zone.id);
  if (zone.id !== lastZoneId) {
    setLastZoneId(zone.id);
    setName(zone.name);
    setDescription(zone.description ?? "");
    setHoursStart(zone.activeHoursStart ?? "");
    setHoursEnd(zone.activeHoursEnd ?? "");
    setEditing(false);
  }

  async function handleSave() {
    await onUpdate({
      name: name.trim() || zone.name,
      description: description.trim() || null,
      activeHoursStart: hoursStart.trim() || null,
      activeHoursEnd: hoursEnd.trim() || null,
    });
    setEditing(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Hero
        icon={LayoutGrid}
        gradient="bg-linear-to-br from-blue-600/40 via-indigo-600/25 to-transparent"
        editLabel={editing ? "Close" : "Edit Zone"}
        onEdit={() => setEditing((v) => !v)}
      />

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Active from</label>
                <Input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Active until</label>
                <Input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending || !name.trim()}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{zone.name}</h2>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">Zone</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  zone.status === "active" ? "text-emerald-400" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    zone.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/50",
                  )}
                />
                {zone.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{zone.description || "No description yet."}</p>
          </>
        )}

        {!editing && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Overview</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <MiniStat icon={DoorOpen} label="Rooms" value={zoneRooms.length} />
                <MiniStat icon={MonitorPlay} label="Screens" value={0} sublabel="Not yet wired" />
                <MiniStat icon={Volume2} label="Audio Zones" value={0} />
                <MiniStat icon={Users} label="Capacity" value={capacity} sublabel="From rooms" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Rooms in this zone</h3>
              <div className="mt-2.5 space-y-2">
                {zoneRooms.length === 0 && (
                  <p className="text-sm text-muted-foreground">No rooms in this zone yet.</p>
                )}
                {zoneRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Store className="size-3.5 text-muted-foreground" />
                      {room.name}
                      <span className="text-xs text-muted-foreground">
                        {room.capacity ?? "—"} capacity
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {zoneRooms.length > 0 && (
                <button
                  type="button"
                  onClick={onViewRooms}
                  className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300"
                >
                  View all rooms in this zone
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Zone Settings</h3>
              <DetailRow label="Active Hours">{formatHours(zone.activeHoursStart, zone.activeHoursEnd)}</DetailRow>
            </div>

            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete Zone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function RoomDetailPanel({
  room,
  zone,
  zones,
  onUpdate,
  onDelete,
  pending,
}: {
  room: Room;
  zone: Zone | undefined;
  zones: Zone[];
  onUpdate: (patch: RoomUpdateInput) => void | Promise<void>;
  onDelete: () => void;
  pending: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(room.name);
  const [roomType, setRoomType] = React.useState(room.roomType ?? "");
  const [capacity, setCapacity] = React.useState(room.capacity != null ? String(room.capacity) : "");
  const [tag, setTag] = React.useState(room.tag ?? "");
  const [description, setDescription] = React.useState(room.roomDescription ?? "");
  const [zoneId, setZoneId] = React.useState(room.zoneId ?? "");

  const [lastRoomId, setLastRoomId] = React.useState(room.id);
  if (room.id !== lastRoomId) {
    setLastRoomId(room.id);
    setName(room.name);
    setRoomType(room.roomType ?? "");
    setCapacity(room.capacity != null ? String(room.capacity) : "");
    setTag(room.tag ?? "");
    setDescription(room.roomDescription ?? "");
    setZoneId(room.zoneId ?? "");
    setEditing(false);
  }

  const zoneNames = zones.map((z) => z.name);
  const selectedZoneName = zones.find((z) => z.id === zoneId)?.name ?? "";

  async function handleSave() {
    await onUpdate({
      name: name.trim() || room.name,
      zoneId: zoneId || undefined,
      roomType: roomType.trim() || null,
      capacity: capacity.trim() ? Number(capacity) : null,
      tag: tag.trim() || null,
      description: description.trim() || null,
    });
    setEditing(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Hero
        icon={Store}
        gradient="bg-linear-to-br from-violet-600/40 via-fuchsia-600/25 to-transparent"
        editLabel={editing ? "Close" : "Edit Room"}
        onEdit={() => setEditing((v) => !v)}
      />

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Zone</label>
                <Select
                  value={selectedZoneName}
                  onValueChange={(n) => {
                    const z = zones.find((zz) => zz.name === n);
                    if (z) setZoneId(z.id);
                  }}
                  items={zoneNames}
                  placeholder="No zone"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Capacity</label>
                <Input
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Room type</label>
                <Input value={roomType} onChange={(e) => setRoomType(e.target.value)} placeholder="e.g. Dining Area" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Tag</label>
                <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Main" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending || !name.trim()}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{room.name}</h2>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                Room
              </span>
              {room.tag && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {room.tag}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{room.roomDescription || "No description yet."}</p>
          </>
        )}

        {!editing && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Overview</h3>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                <MiniStat icon={MonitorPlay} label="Screens" value={0} />
                <MiniStat icon={Volume2} label="Audio Zones" value={0} />
                <MiniStat icon={Users} label="Capacity" value={room.capacity ?? 0} />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Room Details</h3>
              <DetailRow label="Zone">{zone?.name ?? "—"}</DetailRow>
              <DetailRow label="Type">{room.roomType ?? "—"}</DetailRow>
              <DetailRow label="Capacity">
                {room.capacity != null ? `${room.capacity} people` : "—"}
              </DetailRow>
            </div>

            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
