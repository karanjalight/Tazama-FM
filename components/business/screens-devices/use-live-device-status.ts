"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ManagedDevice } from "@/lib/business/device-queries";

const REFRESH_MS = 10_000;

/**
 * Keeps the server-rendered device list live: re-renders the page every
 * 10s while the tab is visible (and immediately when it becomes visible
 * again), so a screen that pairs flips Pending → Online — and a screen
 * that dies ages to Offline — without a manual reload. `router.refresh()`
 * keeps client state (selection, filters, open dialogs) intact.
 *
 * Polling rather than Realtime on purpose: status is derived from
 * `last_seen_at` aging past a threshold, which no row change announces.
 */
export function useLiveDeviceStatus(devices: ManagedDevice[]) {
  const router = useRouter();

  React.useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  // Announce devices that just came online since the previous render.
  const previous = React.useRef<Map<string, ManagedDevice["status"]> | null>(null);
  React.useEffect(() => {
    const before = previous.current;
    previous.current = new Map(devices.map((d) => [d.id, d.status]));
    if (!before) return;
    for (const device of devices) {
      const was = before.get(device.id);
      if (device.status === "online" && was && was !== "online") {
        toast.success(was === "pending" ? `${device.name} is paired and active.` : `${device.name} is back online.`);
      }
    }
  }, [devices]);
}
