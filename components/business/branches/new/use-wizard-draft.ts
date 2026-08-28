"use client";

import * as React from "react";

import {
  DEFAULT_AUDIO_ZONES,
  DEFAULT_LOCATION_DETAILS,
  DEFAULT_ROOMS,
  DEFAULT_SCREENS,
  DEFAULT_ZONES,
  type AudioZone,
  type LocationDetailsForm,
  type WizardRoom,
  type WizardScreen,
  type WizardZone,
} from "./wizard-data";

const STORAGE_KEY = "tazama-business:new-location-draft:v1";

export interface WizardDraft {
  step: number;
  details: LocationDetailsForm;
  zones: WizardZone[];
  rooms: WizardRoom[];
  screens: WizardScreen[];
  audioZones: AudioZone[];
}

const DEFAULT_DRAFT: WizardDraft = {
  step: 1,
  details: DEFAULT_LOCATION_DETAILS,
  zones: DEFAULT_ZONES,
  rooms: DEFAULT_ROOMS,
  screens: DEFAULT_SCREENS,
  audioZones: DEFAULT_AUDIO_ZONES,
};

/**
 * A tiny localStorage-backed external store — module-level (one draft per
 * tab, shared by every hook caller), read via useSyncExternalStore so the
 * client-only localStorage read never needs an effect+setState. `snapshot
 * === DEFAULT_DRAFT` (reference equality) is exactly "nothing was stored
 * yet", which is what `resumed` below is built on.
 */
let snapshot: WizardDraft = DEFAULT_DRAFT;
let initialized = false;
const listeners = new Set<() => void>();

function parseStored(raw: string): WizardDraft {
  const parsed = JSON.parse(raw) as Partial<WizardDraft>;
  return {
    step: parsed.step ?? DEFAULT_DRAFT.step,
    details: { ...DEFAULT_DRAFT.details, ...parsed.details },
    zones: parsed.zones ?? DEFAULT_DRAFT.zones,
    rooms: parsed.rooms ?? DEFAULT_DRAFT.rooms,
    screens: parsed.screens ?? DEFAULT_DRAFT.screens,
    audioZones: parsed.audioZones ?? DEFAULT_DRAFT.audioZones,
  };
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = parseStored(raw);
  } catch {
    // ignore — falls back to DEFAULT_DRAFT
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): WizardDraft {
  ensureInitialized();
  return snapshot;
}

function getServerSnapshot(): WizardDraft {
  return DEFAULT_DRAFT;
}

function writeDraft(next: WizardDraft) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable (private mode, quota) — the draft still
    // works for this tab session, it just won't survive a reload.
  }
  listeners.forEach((l) => l());
}

export function clearWizardDraft() {
  snapshot = DEFAULT_DRAFT;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useWizardDraft() {
  const draft = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDraft = React.useCallback((updater: WizardDraft | ((d: WizardDraft) => WizardDraft)) => {
    writeDraft(typeof updater === "function" ? updater(snapshot) : updater);
  }, []);

  return {
    draft,
    setDraft,
    /** True once we're past the server-rendered default (i.e. running on the client). */
    hydrated: draft !== DEFAULT_DRAFT || initialized,
    /** True if this draft was actually loaded from a prior localStorage save. */
    resumed: draft !== DEFAULT_DRAFT,
    clearDraft: clearWizardDraft,
  };
}
