"use client";

import * as React from "react";
import { Check, Copy, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Lets shoppers get onto this branch's room page (see what's playing, add
 * song requests) without any login — scan the QR or tap the link, matching
 * the frictionless guest entry the room page itself already supports.
 */
export function BranchShareCard({ roomUrl }: { roomUrl: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the link
      // text is still selectable/visible below as a fallback.
    }
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(roomUrl)}`;

  return (
    <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5">
      <img
        src={qrSrc}
        alt="QR code to join this branch's room"
        width={100}
        height={100}
        className="size-[100px] shrink-0 rounded-lg border border-border bg-white p-1.5"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <QrCode className="size-4 text-brand" />
          Let customers request songs
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anyone can scan this or open the link — no account needed.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
            {roomUrl}
          </code>
          <Button onClick={handleCopy} variant="outline" size="sm">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </section>
  );
}
