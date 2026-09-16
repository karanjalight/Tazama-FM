"use client";

import type { TourEventPayload } from "@/lib/business/onboarding-tour";

/** Fire-and-forget: analytics must never slow down or break the tour. */
export function sendTourEvent(payload: TourEventPayload): void {
  try {
    void fetch("/api/business/onboarding/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
