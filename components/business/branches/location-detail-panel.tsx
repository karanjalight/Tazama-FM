"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  DoorOpen,
  ExternalLink,
  MonitorPlay,
  Pencil,
  Store,
  Tv,
  Volume2,
  X,
} from "lucide-react";

import type { LocationSummary } from "@/lib/business/locations-queries";
import { archiveBranch, updateBranchDetails } from "@/app/business/actions";
import {
  getLocationRoomsSummary,
  getLocationDevicesSummary,
  getLocationAudioZonesSummary,
  getLocationEditableDetails,
  type LocationEditableDetails,
} from "@/app/business/branches/detail-panel-actions";
import type { Zone, Room } from "@/lib/business/locations-queries";
import type { ManagedDevice } from "@/lib/business/device-queries";
import type { AudioZone } from "@/lib/business/audio-zone-types";
import { scheduleLabel } from "@/lib/business/audio-zone-types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const TABS = ["Overview", "Rooms", "Screens", "Settings"] as const;
type Tab = (typeof TABS)[number];

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda"] as const;
const TIMEZONES = ["Africa/Nairobi", "Africa/Kampala", "Africa/Dar_es_Salaam", "Africa/Kigali"] as const;

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    <div className="rounded-xl flex items-center border border-border bg-muted/40 p-2.5">
      <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="ml-2.5 flex flex-col">
        <p className="mt-1.5 font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sublabel && <p className="text-[11px] text-emerald-400">{sublabel}</p>}
        </div>
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

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-2.5">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ManageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ExternalLink className="size-3" />
    </Link>
  );
}

function TabLoading() {
  return (
    <div className="mt-4 space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/40" />
      ))}
    </div>
  );
}

function TabEmpty({ label }: { label: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border py-8 text-center">
      <p className="text-sm font-medium text-foreground">Nothing here yet</p>
      <p className="max-w-48 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function LocationDetailPanel({
  location,
  onClose,
}: {
  location: LocationSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [deactivating, setDeactivating] = React.useState(false);

  // ── Edit Location Details ──
  const [editing, setEditing] = React.useState(false);
  const [loadingEdit, setLoadingEdit] = React.useState(false);
  const [form, setForm] = React.useState<LocationEditableDetails | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function startEditing() {
    setEditing(true);
    if (!form) {
      setLoadingEdit(true);
      const details = await getLocationEditableDetails(location.id);
      setLoadingEdit(false);
      if (!details) {
        toast.error("Could not load location details.");
        setEditing(false);
        return;
      }
      setForm(details);
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    const res = await updateBranchDetails({ branchId: location.id, ...form });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Location updated.");
    setEditing(false);
    router.refresh();
  }

  // ── Rooms tab (lazy) ──
  const [roomsData, setRoomsData] = React.useState<{ zones: Zone[]; rooms: Room[] } | null>(null);
  const [loadingRooms, setLoadingRooms] = React.useState(false);

  // ── Screens tab (lazy) ──
  const [devices, setDevices] = React.useState<ManagedDevice[] | null>(null);
  const [loadingDevices, setLoadingDevices] = React.useState(false);

  // ── Settings tab / Audio Zones (lazy) ──
  const [audioZones, setAudioZones] = React.useState<AudioZone[] | null>(null);
  const [loadingAudioZones, setLoadingAudioZones] = React.useState(false);

  async function selectTab(t: Tab) {
    setTab(t);
    if (t === "Rooms" && !roomsData && !loadingRooms) {
      setLoadingRooms(true);
      const data = await getLocationRoomsSummary(location.id);
      setLoadingRooms(false);
      if (data) setRoomsData(data);
      else toast.error("Could not load rooms.");
    }
    if (t === "Screens" && !devices && !loadingDevices) {
      setLoadingDevices(true);
      const data = await getLocationDevicesSummary(location.id);
      setLoadingDevices(false);
      if (data) setDevices(data);
      else toast.error("Could not load screens.");
    }
    if (t === "Settings" && !audioZones && !loadingAudioZones) {
      setLoadingAudioZones(true);
      const data = await getLocationAudioZonesSummary(location.id);
      setLoadingAudioZones(false);
      if (data) setAudioZones(data);
      else toast.error("Could not load audio zones.");
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate "${location.name}"? Its screens will stop receiving content.`)) return;
    setDeactivating(true);
    const res = await archiveBranch({ branchId: location.id });
    setDeactivating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Location deactivated.");
    onClose();
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative flex h-28 items-end bg-linear-to-br from-red-600/40 to-transparent p-3">
        <span className="absolute inset-0 -z-10 bg-muted" />
        <Store className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-foreground/10" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-background/60 text-foreground transition-colors hover:bg-background/80"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{location.name}</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              location.status === "active" ? "text-emerald-400" : "text-rose-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                location.status === "active" ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            {location.status === "active" ? "Active" : "Offline"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{location.address ?? "No address set"}</p>

        <div className="mt-3 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              className={cn(
                "-mb-px border-b-2 px-2 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {t === "Rooms" && ` (${location.rooms})`}
              {t === "Screens" && ` (${location.screens})`}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="mt-3 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Overview</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MiniStat icon={DoorOpen} label="Rooms" value={location.rooms} />
                <MiniStat
                  icon={MonitorPlay}
                  label="Screens"
                  value={location.screens}
                  sublabel={`${location.screensOnline} online`}
                />
                <MiniStat icon={Volume2} label="Audio Zones" value={location.audioZones} />
                <MiniStat
                  icon={Store}
                  label="Content Schedules"
                  value={location.contentSchedules}
                  sublabel={location.schedulesActive ? "Active" : undefined}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Location Details</h3>
                {!editing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={loadingEdit}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <Pencil className="size-3" />
                    {loadingEdit ? "Loading…" : "Edit"}
                  </button>
                )}
              </div>

              {editing && form ? (
                <div className="mt-2.5 space-y-3">
                  <Field id="edit-name" label="Name" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} />
                  <Field id="edit-address" label="Address" value={form.address} onValueChange={(v) => setForm({ ...form, address: v })} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field id="edit-city" label="City" value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} />
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-country">Country</Label>
                      <Select id="edit-country" value={form.country} onValueChange={(v) => setForm({ ...form, country: v })} items={COUNTRIES} placeholder="Country" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-timezone">Timezone</Label>
                    <Select id="edit-timezone" value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })} items={TIMEZONES} placeholder="Timezone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <div className="space-y-2 pt-1">
                    <ToggleRow id="edit-ads" label="Allow ads" hint="Let ad campaigns play on this location's screens." checked={form.allowAds} onCheckedChange={(v) => setForm({ ...form, allowAds: v })} />
                    <ToggleRow id="edit-announcements" label="Allow announcements" hint="Let staff push voice announcements here." checked={form.allowAnnouncements} onCheckedChange={(v) => setForm({ ...form, allowAnnouncements: v })} />
                    <ToggleRow id="edit-engagement" label="Collect engagement data" hint="Aggregate, non-identifying audience analytics." checked={form.collectEngagementData} onCheckedChange={(v) => setForm({ ...form, collectEngagementData: v })} />
                    <ToggleRow id="edit-rating" label="Restrict content rating" hint="Limit content/ads to family-friendly only." checked={form.restrictContentRating} onCheckedChange={(v) => setForm({ ...form, restrictContentRating: v })} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !form.name.trim()}
                      className={cn(buttonVariants({ variant: "brand" }), "flex-1")}
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 space-y-3">
                  <DetailRow label="Address">{location.address ?? "Not set"}</DetailRow>
                  <DetailRow label="Timezone">{location.timezone}</DetailRow>
                  <DetailRow label="Status">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        location.status === "active" ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          location.status === "active" ? "bg-emerald-500" : "bg-rose-500",
                        )}
                      />
                      {location.status === "active" ? "Active" : "Offline"}
                    </span>
                  </DetailRow>
                  <DetailRow label="Created">{formatCreatedAt(location.createdAt)}</DetailRow>
                  <DetailRow label="Last Active">
                    {location.lastSeenAt ? formatRelativeTime(location.lastSeenAt) : "Never"}
                  </DetailRow>
                </div>
              )}
            </div>

            {!editing && (
              <div className="flex gap-2 border-t border-border pt-3">
                <a
                  href="/business/analytics"
                  className={cn(buttonVariants({ variant: "outline" }), "flex-1 gap-1.5")}
                >
                  <BarChart3 className="size-4" />
                  View Analytics
                </a>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "flex-1 gap-1.5 bg-rose-600 text-white hover:bg-rose-600/85 disabled:opacity-50",
                  )}
                >
                  {deactivating ? "Deactivating…" : "Deactivate Location"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "Rooms" && (
          <div>
            {loadingRooms && <TabLoading />}
            {!loadingRooms && roomsData && roomsData.zones.length === 0 && (
              <TabEmpty label="No zones or rooms set up yet." />
            )}
            {!loadingRooms && roomsData && roomsData.zones.length > 0 && (
              <div className="mt-3 space-y-2">
                {roomsData.zones.map((zone) => {
                  const zoneRooms = roomsData.rooms.filter((r) => r.zoneId === zone.id);
                  return (
                    <div key={zone.id} className="rounded-xl border border-border p-2.5">
                      <p className="text-sm font-medium text-foreground">{zone.name}</p>
                      {zoneRooms.length === 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">No rooms yet</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {zoneRooms.map((r) => r.name).join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <ManageLink href={`/business/branches/${location.slug}/rooms-zones`} label="Manage Rooms & Zones" />
          </div>
        )}

        {tab === "Screens" && (
          <div>
            {loadingDevices && <TabLoading />}
            {!loadingDevices && devices && devices.length === 0 && (
              <TabEmpty label="No screens registered yet." />
            )}
            {!loadingDevices && devices && devices.length > 0 && (
              <div className="mt-3 space-y-2">
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Tv className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.roomName ?? "Unassigned"}</p>
                    </div>
                    {d.status === "pending" && d.pairingCode ? (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-amber-400">
                        {d.pairingCode}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 text-xs",
                          d.status === "online" ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            d.status === "online" ? "bg-emerald-500" : "bg-rose-500",
                          )}
                        />
                        {d.status === "online" ? "Online" : "Offline"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <ManageLink href={`/business/branches/${location.slug}/screens-devices`} label="Manage Screens & Devices" />
          </div>
        )}

        {tab === "Settings" && (
          <div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">Audio Zones</h3>
            {loadingAudioZones && <TabLoading />}
            {!loadingAudioZones && audioZones && audioZones.length === 0 && (
              <TabEmpty label="No audio zones set up yet." />
            )}
            {!loadingAudioZones && audioZones && audioZones.length > 0 && (
              <div className="mt-2 space-y-2">
                {audioZones.map((z) => (
                  <div key={z.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{z.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {z.speakersOnline}/{z.speakersTotal} speakers
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {z.roomNames.length ? z.roomNames.join(", ") : "No rooms assigned"} · {scheduleLabel(z)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <ManageLink href={`/business/branches/${location.slug}/audio-zones`} label="Manage Audio Zones" />
          </div>
        )}
      </div>
    </div>
  );
}
