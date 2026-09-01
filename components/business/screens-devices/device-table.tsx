"use client";

import { MonitorPlay, MoreVertical, Volume2 } from "lucide-react";

import type { ManagedDevice } from "@/lib/business/device-queries";
import { formatRelativeTime, cn } from "@/lib/utils";

function StatusPill({ status }: { status: ManagedDevice["status"] }) {
  const cls =
    status === "online" ? "text-emerald-400" : status === "pending" ? "text-amber-400" : "text-rose-400";
  const dot = status === "online" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : "bg-rose-500";
  const label = status === "online" ? "Online" : status === "pending" ? "Pending" : "Offline";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cls)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

function DeviceIcon({ kind }: { kind: ManagedDevice["kind"] }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg bg-linear-to-br text-foreground",
        kind === "screen" ? "from-blue-500/25 to-indigo-500/25" : "from-amber-500/25 to-orange-500/25",
      )}
    >
      {kind === "screen" ? <MonitorPlay className="size-4" /> : <Volume2 className="size-4" />}
    </span>
  );
}

function DeviceRow({
  device,
  selected,
  onSelect,
}: {
  device: ManagedDevice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-t border-border transition-colors",
        selected ? "bg-violet-500/8" : "hover:bg-muted/40",
      )}
      style={selected ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <DeviceIcon kind={device.kind} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{device.name}</p>
            <p className="truncate text-xs text-muted-foreground">{device.deviceModel || "Unknown model"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{device.kind === "screen" ? "Screen" : "Audio Device"}</td>
      <td className="px-3 py-2.5">
        <p className="text-foreground">{device.roomName ?? "Unassigned"}</p>
        {device.zoneName && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {device.zoneName}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <StatusPill status={device.status} />
        {device.status === "pending" && device.pairingCode && (
          <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-amber-400">
            {device.pairingCode}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : "Never connected"}
      </td>
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Device actions"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="size-4" />
        </button>
      </td>
    </tr>
  );
}

export function DeviceTable({
  view,
  devices,
  selectedId,
  onSelect,
}: {
  view: "list" | "grid";
  devices: ManagedDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => {
          const selected = device.id === selectedId;
          return (
            <button
              key={device.id}
              type="button"
              onClick={() => onSelect(device.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected ? "border-violet-500/50 bg-violet-500/8" : "border-border hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <DeviceIcon kind={device.kind} />
                <StatusPill status={device.status} />
              </div>
              <p className="mt-2.5 font-medium text-foreground">{device.name}</p>
              <p className="text-xs text-muted-foreground">{device.deviceModel || "Unknown model"}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{device.roomName ?? "Unassigned"}</span>
                <span>{device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : "Never connected"}</span>
              </div>
              {device.status === "pending" && device.pairingCode && (
                <p className="mt-2 rounded-lg bg-amber-500/15 px-2 py-1 text-center font-mono text-sm font-semibold tracking-[0.2em] text-amber-400">
                  {device.pairingCode}
                </p>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
          <th className="px-3 py-2.5 font-medium">Name</th>
          <th className="px-3 py-2.5 font-medium">Type</th>
          <th className="px-3 py-2.5 font-medium">Room / Zone</th>
          <th className="px-3 py-2.5 font-medium">Status</th>
          <th className="px-3 py-2.5 font-medium">Last Seen</th>
          <th className="px-3 py-2.5 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            selected={device.id === selectedId}
            onSelect={() => onSelect(device.id)}
          />
        ))}
      </tbody>
    </table>
  );
}
