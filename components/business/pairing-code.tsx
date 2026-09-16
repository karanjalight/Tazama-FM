"use client";

import * as React from "react";

import { clearDeviceToken, readDeviceToken, saveDeviceToken } from "@/lib/business/device-token";

/**
 * Kiosk-side pairing screen (`/pair`). Pairs ONCE, then remembers:
 *
 *  - A box with a saved device token (see lib/business/device-token.ts) goes
 *    straight back to its player via `resume` — so `/pair` works as a TV
 *    box's permanent start URL. The token is only forgotten when the server
 *    says the device was removed from the dashboard, never on a network error.
 *  - Otherwise it opens on the 4-digit code from the dashboard (see
 *    registerDevice()), redeemed via `claim-code`.
 *  - The older direction (the kiosk shows a code, staff type it into the
 *    branch page) is still one tap away; its `pair-init` only runs when
 *    chosen, so reloads don't mint throwaway pairing rows.
 *
 * Navigation is a hard `location.replace` (kiosk convention, see
 * `lib/auth/navigate.ts`: proxy/router-cache/cookie races on TV boxes).
 */
type Mode = "loading" | "resuming" | "enter" | "generate";

const CODE_LENGTH = 4;
const RESUME_RETRY_MS = 5_000;

function goToPlayer(slug: string) {
  window.location.replace(`/player/${encodeURIComponent(slug)}`);
}

export function PairingCode() {
  const [mode, setMode] = React.useState<Mode>("loading");
  const [notice, setNotice] = React.useState<string | null>(null);

  // Decide the starting mode on the client — the token lives in browser
  // storage, so the server render can't know it.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only storage on mount
    setMode(readDeviceToken() ? "resuming" : "enter");
  }, []);

  if (mode === "loading") return <div className="h-dvh bg-black" />;

  if (mode === "resuming") {
    return (
      <ResumeScreen
        onUnpaired={() => {
          clearDeviceToken();
          setNotice("This screen was removed from the dashboard. Enter a new code to pair it again.");
          setMode("enter");
        }}
        onPairNew={() => setMode("enter")}
      />
    );
  }

  if (mode === "generate") {
    return <GenerateCodeScreen onBack={() => setMode("enter")} />;
  }

  return <EnterCodeScreen notice={notice} onShowCode={() => setMode("generate")} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-dvh place-items-center bg-black px-6 text-white">
      <div className="w-full max-w-md text-center">{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-sm tracking-wider text-white/60 uppercase">{children}</p>;
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 rounded-md px-2 py-1 text-sm text-white/50 underline underline-offset-2 outline-none focus-visible:bg-white/10 focus-visible:text-white"
    >
      {children}
    </button>
  );
}

function ResumeScreen({ onUnpaired, onPairNew }: { onUnpaired: () => void; onPairNew: () => void }) {
  const [problem, setProblem] = React.useState<string | null>(null);
  const onUnpairedRef = React.useRef(onUnpaired);
  const onPairNewRef = React.useRef(onPairNew);
  React.useEffect(() => {
    onUnpairedRef.current = onUnpaired;
    onPairNewRef.current = onPairNew;
  });

  React.useEffect(() => {
    let cancelled = false;
    let retryId: ReturnType<typeof setTimeout> | null = null;

    async function resume() {
      const deviceToken = readDeviceToken();
      if (!deviceToken) {
        onPairNewRef.current();
        return;
      }
      try {
        const res = await fetch("/api/business/devices/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.slug) {
          goToPlayer(data.slug);
          return;
        }
        if (res.status === 404 && data.unpaired) {
          onUnpairedRef.current();
          return;
        }
        setProblem(data.error ?? "Couldn't reach Tazama.");
      } catch {
        if (cancelled) return;
        setProblem("No connection.");
      }
      // Keep the saved pairing and try again — a box that boots before its
      // Wi-Fi is up must not end up unpaired.
      retryId = setTimeout(resume, RESUME_RETRY_MS);
    }

    resume();
    return () => {
      cancelled = true;
      if (retryId) clearTimeout(retryId);
    };
  }, []);

  return (
    <Shell>
      <span className="mx-auto block size-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />
      <p className="mt-6 text-2xl font-semibold">Reconnecting this screen…</p>
      <p className="mt-2 text-sm text-white/50">
        {problem ? `${problem} Retrying — this screen stays paired.` : "Picking up where it left off."}
      </p>
      {problem && <LinkButton onClick={onPairNew}>Pair with a different code</LinkButton>}
    </Shell>
  );
}

function EnterCodeScreen({ notice, onShowCode }: { notice: string | null; onShowCode: () => void }) {
  const [code, setCode] = React.useState("");
  const [claiming, setClaiming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function claim(value: string) {
    if (value.length !== CODE_LENGTH || claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/business/devices/claim-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.deviceToken || !data.slug) {
        setError(data.error ?? "That code is invalid or has expired.");
        setCode("");
        setClaiming(false);
        inputRef.current?.focus();
        return;
      }
      saveDeviceToken(data.deviceToken);
      goToPlayer(data.slug);
    } catch {
      setError("Network error — check the connection and try again.");
      setClaiming(false);
    }
  }

  return (
    <Shell>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          claim(code);
        }}
      >
        <Eyebrow>Pair this screen</Eyebrow>
        <p className="mt-3 text-lg text-white/80">
          Enter the 4-digit code shown for this screen in your Tazama business dashboard.
        </p>
        {notice && <p className="mt-3 text-sm text-amber-300">{notice}</p>}
        <input
          ref={inputRef}
          autoFocus
          aria-label="4-digit pairing code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          value={code}
          // readOnly, not disabled: a disabled input drops focus, which on a
          // TV leaves the remote's D-pad with nothing selected.
          readOnly={claiming}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setCode(next);
            if (error) setError(null);
            // A full code submits itself — one less remote press on a TV.
            if (next.length === CODE_LENGTH) claim(next);
          }}
          placeholder="····"
          className="mt-6 w-full rounded-2xl border border-white/20 bg-white/5 py-4 pl-[0.3em] text-center font-mono text-7xl font-semibold tracking-[0.3em] text-white outline-none placeholder:text-white/25 focus-visible:border-white/60 read-only:opacity-60"
        />
        <p className="mt-3 min-h-5 text-sm text-red-400" role="alert">
          {error}
        </p>
        <button
          type="submit"
          disabled={claiming || code.length !== CODE_LENGTH}
          className="mt-2 w-full rounded-xl bg-white py-3 text-base font-medium text-black outline-none transition-opacity focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-40"
        >
          {claiming ? "Connecting…" : "Connect"}
        </button>
        <p className="mt-4 text-xs text-white/40">You only need to do this once — this screen remembers its pairing.</p>
      </form>
      <LinkButton onClick={onShowCode}>No code? Show a code to enter in the dashboard instead</LinkButton>
    </Shell>
  );
}

function GenerateCodeScreen({ onBack }: { onBack: () => void }) {
  const [code, setCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let token: string | null = null;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      try {
        const res = await fetch("/api/business/devices/pair-init", { method: "POST" });
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
        const res = await fetch(`/api/business/devices/pair-status?token=${token}`);
        const data = await res.json();
        if (data.status === "claimed" && data.slug) {
          if (pollId) clearInterval(pollId);
          saveDeviceToken(token);
          goToPlayer(data.slug);
        } else if (data.status === "expired") {
          if (pollId) clearInterval(pollId);
          setError("Pairing code expired — go back and try again.");
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

  return (
    <Shell>
      <Eyebrow>Enter this code on your location&apos;s page in the dashboard</Eyebrow>
      {error ? (
        <p className="mt-6 text-lg text-red-400">{error}</p>
      ) : (
        <p className="mt-4 pl-[0.3em] font-mono text-7xl font-semibold tracking-[0.3em] sm:text-8xl">
          {code ?? "······"}
        </p>
      )}
      <LinkButton onClick={onBack}>Back to the 4-digit code</LinkButton>
    </Shell>
  );
}
