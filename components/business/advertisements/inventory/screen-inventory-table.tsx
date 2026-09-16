"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { setScreenAdSettings } from "@/app/business/advertisements/actions";
import type { AdInventory, InventoryScreen } from "@/lib/business/ad-inventory-queries";
import type { ScreenAvailability } from "@/lib/business/ad-inventory";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatShortDate } from "../format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const AVAILABILITY_ITEMS = ["All Availability", "Available", "Booked", "Restricted"] as const;
const AVAILABILITY_META: Record<ScreenAvailability, { label: string; className: string }> = {
  Available: { label: "Available", className: "bg-emerald-500/10 text-emerald-400" },
  Booked: { label: "Booked", className: "bg-amber-500/10 text-amber-400" },
  Restricted: { label: "Ads off", className: "bg-rose-500/10 text-rose-400" },
};

function CpmInput({ screen, disabled, onSave }: { screen: InventoryScreen; disabled: boolean; onSave: (cpm: number | null) => void }) {
  const [value, setValue] = React.useState(screen.cpm == null ? "" : String(screen.cpm));
  const commit = () => {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      toast.error("CPM must be a positive number.");
      setValue(screen.cpm == null ? "" : String(screen.cpm));
      return;
    }
    if (next === screen.cpm) return;
    onSave(next);
  };
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-xs text-muted-foreground">KES</span>
      <Input
        type="number"
        min={0}
        step={50}
        inputMode="decimal"
        aria-label={`CPM for ${screen.name}`}
        value={value}
        placeholder={String(screen.effectiveCpm)}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-8 w-24 rounded-lg px-2 text-right font-mono text-sm"
      />
    </div>
  );
}

export function ScreenInventoryTable({ businessId, inventory }: { businessId: string; inventory: AdInventory }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("All Locations");
  const [availability, setAvailability] = React.useState<(typeof AVAILABILITY_ITEMS)[number]>("All Availability");
  const [page, setPage] = React.useState(1);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const locationItems = ["All Locations", ...inventory.locations.map((l) => l.name)];
  const q = query.trim().toLowerCase();
  const filtered = inventory.screens.filter((s) => {
    if (location !== "All Locations" && s.locationName !== location) return false;
    if (availability !== "All Availability" && s.availability !== availability) return false;
    if (q && ![s.name, s.roomName, s.zoneName, s.locationName].some((v) => v?.toLowerCase().includes(q))) return false;
    return true;
  });
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function save(screen: InventoryScreen, patch: { adsEnabled?: boolean; cpm?: number | null }) {
    setSavingId(screen.id);
    const res = await setScreenAdSettings({ businessId, deviceId: screen.id, ...patch });
    setSavingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      patch.adsEnabled !== undefined
        ? `Ads ${patch.adsEnabled ? "on" : "off"} for ${screen.name}.`
        : `CPM for ${screen.name} ${patch.cpm == null ? "reset to default" : "updated"}.`,
    );
    router.refresh();
  }

  const locationBlocked = (s: InventoryScreen) => !s.locationAllowsAds;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Screen Inventory</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search screens or rooms"
                className="h-9 w-48 rounded-lg pl-8 text-sm"
              />
            </div>
            <Select
              value={location}
              onValueChange={(v) => {
                setLocation(v);
                setPage(1);
              }}
              items={locationItems}
              className="h-9 w-40 rounded-lg text-sm"
            />
            <Select
              value={availability}
              onValueChange={(v) => {
                setAvailability(v as (typeof AVAILABILITY_ITEMS)[number]);
                setPage(1);
              }}
              items={AVAILABILITY_ITEMS}
              className="h-9 w-40 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Screen</th>
                <th className="px-3 py-2 font-medium">Placement</th>
                <th className="px-3 py-2 font-medium">Availability</th>
                <th className="px-3 py-2 font-medium">Booked by today</th>
                <th className="px-3 py-2 text-right font-medium">CPM</th>
                <th className="py-2 pl-3 text-right font-medium">Ads</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2.5 pr-3">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <span className={cn("size-2 shrink-0 rounded-full", s.online ? "bg-emerald-500" : "bg-muted-foreground/40")} aria-label={s.online ? "Online" : "Offline"} />
                      {s.name}
                    </p>
                    <p className="pl-4 text-xs text-muted-foreground">{s.online ? "Online" : s.lastSeenAt ? `Last seen ${formatShortDate(s.lastSeenAt)}` : "Never connected"}</p>
                  </td>
                  <td className="max-w-56 px-3 py-2.5 text-muted-foreground">
                    <p className="truncate text-foreground">{s.roomName ?? "No room"}</p>
                    <p className="truncate text-xs">{[s.locationName, s.zoneName].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", AVAILABILITY_META[s.availability].className)}>
                      {AVAILABILITY_META[s.availability].label}
                    </span>
                    {s.liveNow && <span className="ml-1.5 text-[10px] font-semibold text-rose-400 uppercase">live</span>}
                  </td>
                  <td className="max-w-56 px-3 py-2.5">
                    {s.campaignsToday.length ? (
                      <div className="flex flex-wrap gap-1">
                        {s.campaignsToday.map((c) => (
                          <Link
                            key={c.id}
                            href={`/business/advertisements/campaigns?campaign=${c.id}`}
                            className="truncate rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground hover:bg-muted/70"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <CpmInput key={`${s.id}-${s.cpm}`} screen={s} disabled={savingId === s.id || !inventory.schemaReady} onSave={(cpm) => save(s, { cpm })} />
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <Switch
                      checked={s.adsEnabled}
                      disabled={savingId === s.id || !inventory.schemaReady}
                      onCheckedChange={(checked) => save(s, { adsEnabled: checked })}
                      aria-label={`Ads on ${s.name}`}
                      style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}
                    />
                    {locationBlocked(s) && <p className="mt-0.5 text-[10px] text-rose-400">location off</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {pageItems.map((s) => (
            <div key={s.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <span className={cn("size-2 shrink-0 rounded-full", s.online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                    <span className="truncate">{s.name}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[s.locationName, s.zoneName, s.roomName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Switch
                  checked={s.adsEnabled}
                  disabled={savingId === s.id || !inventory.schemaReady}
                  onCheckedChange={(checked) => save(s, { adsEnabled: checked })}
                  aria-label={`Ads on ${s.name}`}
                  style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", AVAILABILITY_META[s.availability].className)}>
                  {AVAILABILITY_META[s.availability].label}
                  {s.campaignsToday.length > 0 && ` · ${s.campaignsToday.length}`}
                </span>
                <CpmInput key={`${s.id}-${s.cpm}`} screen={s} disabled={savingId === s.id || !inventory.schemaReady} onSave={(cpm) => save(s, { cpm })} />
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No screens match these filters.</p>}

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} screens
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-lg border border-input px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= maxPage}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-lg border border-input px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <BookingCalendar inventory={inventory} screens={pageItems} />
    </>
  );
}

function BookingCalendar({ inventory, screens }: { inventory: AdInventory; screens: InventoryScreen[] }) {
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const shade = (minutes: number) => {
    if (minutes <= 0) return "bg-muted";
    const hours = minutes / 60;
    if (hours < 3) return "bg-violet-500/30";
    if (hours < 8) return "bg-violet-500/55";
    if (hours < 16) return "bg-violet-500/80";
    return "bg-violet-500";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Booking Calendar · next 7 days</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Hours booked per screen by active and scheduled campaigns (the screens shown in the table above).
      </p>
      {screens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No screens to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-140">
            <div className="grid grid-cols-[minmax(120px,1.4fr)_repeat(7,minmax(0,1fr))] gap-1.5">
              <div />
              {inventory.days.map((d, i) => (
                <div key={d} className={cn("text-center text-[10px] font-medium", i === 0 ? "text-violet-400" : "text-muted-foreground")}>
                  {i === 0 ? "Today" : dayLabel(d)}
                  <span className="block font-normal text-muted-foreground">{formatShortDate(d)}</span>
                </div>
              ))}
              {screens.map((s) => (
                <React.Fragment key={s.id}>
                  <div className="flex min-w-0 items-center truncate text-xs text-foreground" title={`${s.name} · ${s.roomName ?? ""}`}>
                    {s.name}
                  </div>
                  {s.week.map((minutes, di) => {
                    const restricted = s.availability === "Restricted";
                    const hours = Math.round((minutes / 60) * 10) / 10;
                    const text = restricted ? "Ads off" : minutes > 0 ? `${hours}h booked` : "Available";
                    return (
                      <div
                        key={`${s.id}-${di}`}
                        role="img"
                        aria-label={`${s.name} on ${inventory.days[di]}: ${text}`}
                        title={`${s.name} · ${formatShortDate(inventory.days[di])}: ${text}`}
                        className={cn(
                          "grid h-7 place-items-center rounded-sm font-mono text-[10px]",
                          restricted ? "bg-rose-500/15 text-rose-400" : shade(minutes),
                          minutes >= 8 * 60 && !restricted ? "text-white" : "text-muted-foreground",
                        )}
                      >
                        {restricted ? "off" : minutes > 0 ? `${hours}h` : ""}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-500/55" /> Partly booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-500" /> Booked most of the day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500/15" /> Ads off
        </span>
      </div>
    </div>
  );
}
