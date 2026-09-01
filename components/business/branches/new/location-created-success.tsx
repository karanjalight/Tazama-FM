"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Check, MonitorPlay } from "lucide-react";

import type { CreateLocationResult } from "@/app/business/branches/new/actions";
import { VioletButton } from "./violet-button";

export function LocationCreatedSuccess({
  result,
  locationName,
}: {
  result: Extract<CreateLocationResult, { ok: true }>;
  locationName: string;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-5 py-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{locationName} created</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It&apos;s now available to pair devices, set up audio zones, and schedule content.
        </p>
      </div>

      {result.screens.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-left">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MonitorPlay className="size-4" />
            Screen pairing codes
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            On each TV, open the Tazama Player and choose &ldquo;Enter a code instead,&rdquo; then
            type the matching code below. Codes expire in 7 days.
          </p>
          <ul className="mt-3 space-y-2">
            {result.screens.map((s) => (
              <li
                key={s.code}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.roomName}</span>
                </span>
                <span className="shrink-0 font-mono text-xl font-semibold tracking-[0.2em] text-violet-400">
                  {s.code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-200">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4 shrink-0" />
            A few things need a second look
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <VioletButton
        className="mx-auto"
        onClick={() => router.push(`/business/branches/${result.branchId}`)}
      >
        Go to {locationName}
      </VioletButton>
    </div>
  );
}
