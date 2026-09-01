"use client";

import * as React from "react";

/**
 * Kiosk-side pairing screen: calls `pair-init` once, shows the code large,
 * and polls `pair-status` until claimed — then hard-navigates to the
 * paired branch's player (matches the existing kiosk hard-nav convention
 * in `lib/auth/navigate.ts`: proxy/router-cache/cookie races on TV boxes).
 *
 * Also offers the reverse direction: a screen already registered from the
 * dashboard (see registerScreen()) has a 4-digit code waiting to be entered
 * here instead of waiting for one to be generated.
 */
export function PairingCode() {
  const [code, setCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [enterCodeMode, setEnterCodeMode] = React.useState(false);
  const [enteredCode, setEnteredCode] = React.useState("");
  const [claiming, setClaiming] = React.useState(false);
  const [claimError, setClaimError] = React.useState<string | null>(null);

  async function handleClaimCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = enteredCode.trim();
    if (!trimmed) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/business/devices/claim-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaiming(false);
        setClaimError(data.error ?? "That code is invalid or has expired.");
        return;
      }
      window.localStorage.setItem("tz_device_token", data.deviceToken);
      window.location.assign(`/player/${data.slug}`);
    } catch {
      setClaiming(false);
      setClaimError("Network error redeeming code.");
    }
  }

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
          if (token) window.localStorage.setItem("tz_device_token", token);
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

  if (error && !enterCodeMode) {
    return (
      <div className="grid h-dvh place-items-center bg-black text-white">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (enterCodeMode) {
    return (
      <div className="grid h-dvh place-items-center bg-black text-white">
        <form onSubmit={handleClaimCode} className="w-full max-w-sm text-center">
          <p className="font-mono text-sm tracking-wider text-white/60 uppercase">
            Enter the code from your Tazama business dashboard
          </p>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={4}
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
            placeholder="····"
            className="mt-4 w-full rounded-2xl border border-white/20 bg-white/5 py-4 text-center font-mono text-6xl font-semibold tracking-[0.3em] text-white outline-none placeholder:text-white/30 focus-visible:border-white/50"
          />
          {claimError && <p className="mt-3 text-sm text-red-400">{claimError}</p>}
          <button
            type="submit"
            disabled={claiming || enteredCode.trim().length === 0}
            className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-opacity disabled:opacity-40"
          >
            {claiming ? "Connecting…" : "Connect"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEnterCodeMode(false);
              setClaimError(null);
            }}
            className="mt-4 text-xs text-white/50 underline underline-offset-2"
          >
            Back to auto-generated code
          </button>
        </form>
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
        <button
          type="button"
          onClick={() => setEnterCodeMode(true)}
          className="mt-6 text-xs text-white/50 underline underline-offset-2"
        >
          Already have a code? Enter it instead
        </button>
      </div>
    </div>
  );
}
