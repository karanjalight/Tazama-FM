"use client";

import * as React from "react";

/**
 * Install state for the PWA, modelled as an external store so we can capture the
 * `beforeinstallprompt` event the moment it fires (often before React mounts)
 * and read it with `useSyncExternalStore` (no setState-in-effect, SSR-safe).
 *
 *   installable → Chromium fired beforeinstallprompt; call promptInstall()
 *   ios         → iOS Safari (no prompt API) → show "Add to Home Screen"
 *   installed   → already running standalone / just installed
 *   unsupported → browser can't install (e.g. desktop Firefox/Safari)
 */
export type InstallMode =
  | "loading"
  | "installable"
  | "ios"
  | "installed"
  | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS reports as Mac with touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function computeMode(): InstallMode {
  if (typeof window === "undefined") return "loading";
  if (installed || isStandalone()) return "installed";
  if (deferredPrompt) return "installable";
  if (isIOS()) return "ios";
  return "unsupported";
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const mq =
    typeof window !== "undefined"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  mq?.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
  };
}

export type PromptResult = "accepted" | "dismissed" | "unavailable";

export function useInstall(): {
  mode: InstallMode;
  promptInstall: () => Promise<PromptResult>;
} {
  const mode = React.useSyncExternalStore(
    subscribe,
    computeMode,
    () => "loading" as InstallMode,
  );

  const promptInstall = React.useCallback(async (): Promise<PromptResult> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome;
  }, []);

  return { mode, promptInstall };
}
