"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

const noopSubscribe = () => () => {};
/** How long the on-screen "Requested by" credit stays up once a requested
 * song starts — long enough to notice, short enough not to clutter the video. */
const CREDIT_VISIBLE_MS = 12_000;

/**
 * Pair with a Screen's presence on the venue TV (kiosk-room-player.tsx),
 * mounted with a single line: a corner QR badge guests scan to pair their
 * phone, and a brief "Requested by" credit when a guest's request starts.
 * Stays at z-15 or below — the kiosk's ad overlay (z-30) must cover it.
 * Never interactive: the kiosk's full-screen tap layer keeps working.
 */
export function KioskPairOverlay({
  pairSlug,
  trackId,
  requestedByName,
}: {
  pairSlug: string | null;
  /** The playing track's youtubeId — a new id restarts the credit. */
  trackId: string | null;
  requestedByName: string | null;
}) {
  // Browser-only origin without an effect or a hydration mismatch.
  const origin = React.useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [creditHiddenFor, setCreditHiddenFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!trackId || !requestedByName) return;
    const id = window.setTimeout(() => setCreditHiddenFor(trackId), CREDIT_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [trackId, requestedByName]);

  const showCredit = !!trackId && !!requestedByName && creditHiddenFor !== trackId;
  const pairUrl = origin && pairSlug ? `${origin}/pair/${pairSlug}` : null;

  return (
    <>
      {pairUrl && (
        <div className="pointer-events-none absolute top-5 right-5 z-15 flex items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-4 text-black shadow-2xl sm:top-7 sm:right-7">
          {/* eslint-disable-next-line @next/next/no-img-element -- external QR image service, fixed small size */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(pairUrl)}`}
            alt="Scan to pair your phone with this screen"
            width={88}
            height={88}
            className="size-[88px] shrink-0"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Scan to pair</p>
            <p className="mt-0.5 text-xs text-black/60">Request the next song</p>
          </div>
        </div>
      )}

      {showCredit && (
        <div className="pointer-events-none absolute bottom-32 left-5 z-15 inline-flex max-w-[70vw] items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-base font-medium text-white shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 sm:left-7">
          <Sparkles className="size-4 shrink-0 text-brand" />
          <span className="truncate">Requested by {requestedByName}</span>
        </div>
      )}
    </>
  );
}
