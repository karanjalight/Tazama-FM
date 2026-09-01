"use client";

import * as React from "react";

import { CAMPAIGNS, type Campaign } from "./mock-data";

/**
 * Module-level shared store (useSyncExternalStore, not React state) so a
 * campaign created from the Overview page's "+ Create Campaign" is visible
 * on the Campaigns page too, and vice versa — both pages previously held
 * their own independent `useState(CAMPAIGNS)`, so a campaign created on one
 * page never appeared on the other. Frontend-only; nothing here is real
 * persistence (resets on a full page reload).
 */
let campaigns: Campaign[] = CAMPAIGNS;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return campaigns;
}

export function useCampaigns(): Campaign[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addCampaign(campaign: Campaign) {
  campaigns = [campaign, ...campaigns];
  emit();
}

export function toggleCampaignStatus(id: string) {
  campaigns = campaigns.map((c) => (c.id === id ? { ...c, status: c.status === "Active" ? "Paused" : "Active" } : c));
  emit();
}
