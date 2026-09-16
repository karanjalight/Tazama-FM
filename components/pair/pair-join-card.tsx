"use client";

import * as React from "react";
import { MonitorPlay, Smartphone, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pairWithDevice } from "@/app/pair/actions";
import { MAX_DISPLAY_NAME_LENGTH } from "@/lib/pair/request-rules";
import type { PairDevice } from "@/lib/pair/types";

/** The pairing moment — shown once per phone, before the live view. */
export function PairJoinCard({
  device,
  suggestedName,
  onPaired,
}: {
  device: PairDevice;
  suggestedName: string;
  onPaired: () => void;
}) {
  const [name, setName] = React.useState(suggestedName);
  const [pending, startTransition] = React.useTransition();
  const DeviceIcon = device.kind === "audio" ? Volume2 : MonitorPlay;
  const place = [device.roomName, device.branchName].filter(Boolean).join(" · ");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await pairWithDevice(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onPaired();
    });
  }

  return (
    <main className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-md place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full rounded-3xl border border-border bg-card p-7 text-center shadow-soft">
        <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
          <DeviceIcon className="size-8" />
          <span className="absolute -right-1.5 -bottom-1.5 grid size-7 place-items-center rounded-full border border-border bg-background text-foreground">
            <Smartphone className="size-3.5" />
          </span>
        </span>

        <p className="mt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Pair with</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{device.name}</h1>
        {place && <p className="mt-1 text-sm text-muted-foreground">{place}</p>}

        <label htmlFor="pair-name" className="mt-7 block text-left text-sm font-medium text-foreground">
          Your name
        </label>
        <Input
          id="pair-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          placeholder="e.g. Amina"
          autoComplete="nickname"
          className="mt-1.5 h-11 text-base"
        />

        <Button type="submit" variant="brand" size="xl" className="mt-4 w-full" disabled={pending || !name.trim()}>
          {pending ? "Pairing…" : "Pair"}
        </Button>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          See what&apos;s playing, request songs and react with everyone here. Sound stays off on your phone unless you
          turn it on.
        </p>
      </form>
    </main>
  );
}
