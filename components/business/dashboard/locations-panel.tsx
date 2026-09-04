"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Monitor, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type DashboardDeviceStatus = "online" | "offline" | "pending";

export interface DashboardLocationDevice {
  id: string;
  name: string;
  kind: "screen" | "audio";
  status: DashboardDeviceStatus;
}

export interface DashboardLocationRoom {
  id: string;
  name: string;
  devices: DashboardLocationDevice[];
}

export interface DashboardLocation {
  id: string;
  name: string;
  roomCount: number;
  screenCount: number;
  online: number;
  offline: number;
  pending: number;
  rooms: DashboardLocationRoom[];
}

/** Same three states/labels the Screen Status donut uses for these same
 * devices — keeping the wording identical across panels matters here, since
 * a never-connected ("pending") screen is a genuinely different situation
 * from one that dropped ("offline"), not just a color choice. */
const STATUS_META: Record<DashboardDeviceStatus, { dot: string; label: string }> = {
  online: { dot: "bg-emerald-500", label: "Online" },
  offline: { dot: "bg-rose-500", label: "Offline" },
  pending: { dot: "bg-amber-500", label: "Pending" },
};

function StatusDot({ status }: { status: DashboardDeviceStatus }) {
  return <span className={cn("size-1.5 rounded-full", STATUS_META[status].dot)} />;
}

function RoomRow({ room }: { room: DashboardLocationRoom }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {room.name} · {room.devices.length} device{room.devices.length === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap gap-2">
        {room.devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
          >
            {device.kind === "audio" ? (
              <Volume2 className="size-3.5 text-muted-foreground" />
            ) : (
              <Monitor className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-foreground">{device.name}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <StatusDot status={device.status} />
              {STATUS_META[device.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocationsPanel({ locations }: { locations: DashboardLocation[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(locations[0]?.id ?? null);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Locations & Screens</h2>
        <Link
          href="/business/branches"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View all
        </Link>
      </div>

      {locations.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
          <MapPin className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No locations yet.</p>
          <Link
            href="/business/branches/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Add your first location
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          {locations.map((location) => {
            const isExpanded = expanded === location.id;
            const hasRooms = location.rooms.length > 0;
            return (
              <div key={location.id}>
                <button
                  type="button"
                  onClick={() =>
                    hasRooms &&
                    setExpanded((current) => (current === location.id ? null : location.id))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors",
                    hasRooms && "hover:bg-muted/50",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {location.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {location.roomCount} room{location.roomCount === 1 ? "" : "s"} ·{" "}
                      {location.screenCount} screen{location.screenCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                    <span className="flex items-center gap-1.5">
                      <StatusDot status="online" />
                      {location.online} Online
                    </span>
                    {location.offline > 0 && (
                      <span className="flex items-center gap-1.5">
                        <StatusDot status="offline" />
                        {location.offline} Offline
                      </span>
                    )}
                    {location.pending > 0 && (
                      <span className="flex items-center gap-1.5">
                        <StatusDot status="pending" />
                        {location.pending} Pending
                      </span>
                    )}
                  </span>
                  {hasRooms && (
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  )}
                </button>
                {hasRooms && isExpanded && (
                  <div className="mb-2 ml-12 space-y-2">
                    {location.rooms.map((room) => (
                      <RoomRow key={room.id} room={room} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
