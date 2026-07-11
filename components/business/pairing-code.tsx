"use client";

import * as React from "react";

/**
 * Kiosk-side pairing screen: calls `pair-init` once, shows the code large,
 * and polls `pair-status` until claimed — then hard-navigates to the
 * paired branch's player (matches the existing kiosk hard-nav convention
 * in `lib/auth/navigate.ts`: proxy/router-cache/cookie races on TV boxes).
 */
export function PairingCode() {
  const [code, setCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let token: string | null = null;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      try {
        const res = await fetch("/api/business/devices/pair-init", {
          method: "POST",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not start pairing.");
          return;
        }
        token = data.deviceToken;
        setCode(data.code);
        pollId = setInterval(poll, 3000);
      } catch {
        if (!cancelled) setError("Network error starting pairing.");
      }
    }

    async function poll() {
      if (!token) return;
      try {
        const res = await fetch(
          `/api/business/devices/pair-status?token=${token}`,
        );
        const data = await res.json();
        if (data.status === "claimed" && data.slug) {
          if (pollId) clearInterval(pollId);
          window.location.assign(`/player/${data.slug}`);
        } else if (data.status === "expired") {
          if (pollId) clearInterval(pollId);
          setError("Pairing code expired — reload to get a new one.");
        }
      } catch {
        // Transient network errors: keep polling silently.
      }
    }

    init();
    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, []);

  if (error) {
    return (
      <div className="grid h-dvh place-items-center bg-black text-white">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid h-dvh place-items-center bg-black text-white">
      <div className="text-center">
        <p className="font-mono text-sm tracking-wider text-white/60 uppercase">
          Enter this code in your Tazama business dashboard
        </p>
        <p className="mt-4 font-mono text-8xl font-semibold tracking-[0.3em]">
          {code ?? "······"}
        </p>
      </div>
    </div>
  );
}
