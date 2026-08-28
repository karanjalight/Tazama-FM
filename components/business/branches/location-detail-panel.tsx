"use client";

import * as React from "react";
import {
  BarChart3,
  CalendarClock,
  DoorOpen,
  MonitorPlay,
  Pencil,
  Store,
  Volume2,
  X,
} from "lucide-react";

import type { MockLocation } from "./mock-data";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const TABS = ["Overview", "Rooms", "Screens", "Settings"] as const;
type Tab = (typeof TABS)[number];

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

export function LocationDetailPanel({
  location,
  onClose,
}: {
  location: MockLocation;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>("Overview");

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
          {location.badge && (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
              {location.badge}
            </span>
          )}
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
        <p className="mt-0.5 text-sm text-muted-foreground">{location.address}</p>

        <div className="mt-3 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
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

        {tab === "Overview" ? (
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
                  icon={CalendarClock}
                  label="Content Schedules"
                  value={location.contentSchedules}
                  sublabel={location.schedulesActive ? "Active" : undefined}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Location Details</h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
              <div className="mt-2 space-y-2.5">
                <DetailRow label="Business">{location.business}</DetailRow>
                <DetailRow label="Address">{location.address}</DetailRow>
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
                <DetailRow label="Created">{location.createdAt}</DetailRow>
                <DetailRow label="Last Active">{location.lastActive}</DetailRow>
              </div>
            </div>

            <div className="flex gap-2 border-t border-border pt-3">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "flex-1 gap-1.5")}
              >
                <BarChart3 className="size-4" />
                View Analytics
              </button>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "flex-1 gap-1.5 bg-rose-600 text-white hover:bg-rose-600/85",
                )}
              >
                Deactivate Location
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
              <Store className="size-4" />
            </span>
            <p className="text-sm font-medium text-foreground">{tab} — coming soon</p>
            <p className="max-w-48 text-xs text-muted-foreground">
              This preview only wires up the Overview tab so far.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
