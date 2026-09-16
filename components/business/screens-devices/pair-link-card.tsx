"use client";

import * as React from "react";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";

const noopSubscribe = () => () => {};

/**
 * Staff-facing entry point to Pair with a Screen: the QR code and link guests
 * use to pair their phone with this device (see app/pair/[slug]/page.tsx).
 * Same public QR image service as `BranchShareCard`.
 */
export function PairLinkCard({ slug, deviceName }: { slug: string; deviceName: string }) {
  // Browser-only value without an effect or a hydration mismatch.
  const origin = React.useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const url = `${origin}/pair/${slug}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  function copy() {
    if (!navigator.clipboard) {
      toast.message(url);
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success("Pairing link copied."),
      () => toast.message(url),
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <QrCode className="size-4 text-violet-400" />
        Guest pairing
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Guests scan this to pair their phone with {deviceName}: see what&apos;s playing, request songs and react.
      </p>
      <div className="mt-3 flex items-center gap-3">
        {origin && (
          // eslint-disable-next-line @next/next/no-img-element -- external QR image service, fixed small size
          <img
            src={qrSrc}
            alt={`QR code to pair with ${deviceName}`}
            width={96}
            height={96}
            className="size-24 shrink-0 rounded-lg border border-border bg-white p-1.5"
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate font-mono text-xs text-foreground">/pair/{slug}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Copy className="size-3.5" />
              Copy link
            </button>
            <a
              href={`/pair/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              Open
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
