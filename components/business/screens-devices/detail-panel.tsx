"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  MapPin,
  MonitorPlay,
  Pencil,
  Power,
  RefreshCw,
  RotateCw,
  Trash2,
  Volume2,
  Wifi,
  X,
} from "lucide-react";

import type { ManagedDevice } from "@/lib/business/device-queries";
import { renameDevice, regenerateDevicePairingCode } from "@/app/business/locations/actions";
import { forgetDevice } from "@/app/business/actions";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Absolute, not relative — `formatRelativeTime` assumes a past timestamp
 * ("Xm ago") and would misreport a future expiry as "just now"; this also
 * sidesteps needing `Date.now()` during render (react-hooks/purity). */
function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * The caller MUST render this keyed by `device.id` — local edit-draft state
 * only initializes once per mount, same convention as the other detail
 * panels this session (PlaylistDetailPanel, ContentDetailPanel).
 */
export function DeviceDetailPanel({ device, onClose }: { device: ManagedDevice; onClose: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(device.name);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const res = await renameDevice({ branchId: device.branchId, deviceId: device.id, name: trimmed });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Device renamed.");
    setEditing(false);
    router.refresh();
  }

  async function handleRegenerateCode() {
    const message =
      device.status === "online"
        ? `${device.name} is currently online. Regenerating its pairing code will disconnect it until it's re-paired with the new code. Continue?`
        : `Generate a new pairing code for ${device.name}?`;
    if (!confirm(message)) return;
    setRegenerating(true);
    const res = await regenerateDevicePairingCode({ branchId: device.branchId, deviceId: device.id });
    setRegenerating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("New pairing code generated.");
    router.refresh();
  }

  async function handleForget() {
    if (!confirm(`Forget "${device.name}"? It will need to be re-paired to connect again.`)) return;
    setRemoving(true);
    const res = await forgetDevice({ branchId: device.branchId, deviceId: device.id });
    setRemoving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Device forgotten.");
    onClose();
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative flex h-32 items-start justify-between p-3">
        <span className="absolute inset-0 -z-10 bg-muted" />
        {device.kind === "screen" ? (
          <MonitorPlay className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-foreground/10" />
        ) : (
          <Volume2 className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-foreground/10" />
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            device.status === "online"
              ? "bg-emerald-500/15 text-emerald-400"
              : device.status === "pending"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-rose-500/15 text-rose-400",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              device.status === "online" ? "bg-emerald-500" : device.status === "pending" ? "bg-amber-500" : "bg-rose-500",
            )}
          />
          {device.status === "online" ? "Online" : device.status === "pending" ? "Pending" : "Offline"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="grid size-7 place-items-center rounded-full bg-background/70 text-foreground transition-colors hover:bg-background/90"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 min-w-0 flex-1 text-base font-semibold"
              maxLength={60}
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{device.name}</h2>
          )}
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {device.kind === "screen" ? "Screen" : "Audio Device"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{device.deviceModel || "Unknown model"}</p>

        {device.pairingCode && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
            <p className="text-xs font-medium text-amber-300">
              Not connected yet — enter this code on {device.name}&apos;s screen
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(device.pairingCode!);
                toast.success("Pairing code copied.");
              }}
              className="mt-2 font-mono text-3xl font-semibold tracking-[0.3em] text-amber-200 transition-colors hover:text-amber-100"
              title="Copy pairing code"
            >
              {device.pairingCode}
            </button>
            <p className="mt-1.5 text-[11px] text-amber-300/70">
              On the device: open the Tazama Player, choose &ldquo;Enter a code instead,&rdquo; and type this in.
              {device.pairingCodeExpiresAt &&
                ` Expires ${formatExpiry(device.pairingCodeExpiresAt)}.`}
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <DetailRow
            icon={MapPin}
            label="Location"
            value={device.roomName ? `${device.roomName}${device.zoneName ? `, ${device.zoneName}` : ""}` : "Unassigned"}
          />
          <DetailRow icon={Wifi} label="IP Address" value={device.ipAddress ?? "—"} />
          <div className="flex items-start gap-2.5 text-sm">
            <Copy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Device ID</p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(device.id)}
                className="truncate font-mono text-foreground hover:text-violet-400"
              >
                {device.id}
              </button>
            </div>
          </div>
          <DetailRow
            icon={RotateCw}
            label="Last Seen"
            value={device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : "Never connected"}
          />
          <DetailRow icon={Power} label="Paired" value={formatRelativeTime(device.pairedAt)} />
        </div>

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleRegenerateCode}
            disabled={regenerating}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", regenerating && "animate-spin")} />
            {regenerating ? "Generating…" : "Regenerate Pairing Code"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setName(device.name);
                  }}
                  className="rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleForget}
                  disabled={removing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-strong py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a82420] disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  {removing ? "Forgetting…" : "Forget"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
