"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { InstallButton } from "./install-button";
import { useInstall } from "./use-install";

const DISMISS_KEY = "tazama:install-dismissed";
/** App surfaces with their own bottom chrome (now-playing bar) — skip there. */
const HIDDEN_PREFIXES = ["/dashboard", "/rooms", "/player", "/onboarding"];

/**
 * Subtle, dismissible install banner. Shown on marketing surfaces when the app
 * is installable (or on iOS) and hasn't been dismissed. Dismissal is remembered.
 */
export function InstallBanner() {
  const { mode } = useInstall();
  const pathname = usePathname();

  // Lazy init (no setState-in-effect): SSR returns hidden; both server and the
  // first client render are null because `mode` starts "loading".
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const onAppRoute = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const show =
    !dismissed && !onAppRoute && (mode === "installable" || mode === "ios");
  if (!show) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — fine, just won't persist */
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-ink/95 p-3 pr-2 text-white shadow-lift backdrop-blur-xl">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install Tazama</p>
          <p className="truncate text-xs text-white/60">
            Full-screen, app-like, one tap away.
          </p>
        </div>
        <InstallButton
          variant="brand"
          size="sm"
          label={mode === "ios" ? "How" : "Install"}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
