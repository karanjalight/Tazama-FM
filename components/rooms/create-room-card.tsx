"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { CreateRoomDialog } from "@/components/rooms/create-room-dialog";
import type { SubscriptionPlan } from "@/lib/billing/plans";

/** The "+ Create" tile that leads the "Your Rooms" strip and opens the wizard. */
export function CreateRoomCard({
  accountType,
  currentPlan,
  origin,
}: {
  accountType: "individual" | "business" | null;
  currentPlan: SubscriptionPlan;
  origin: string;
}) {
  const [open, setOpen] = React.useState(false);
  // Bump on each open so the dialog remounts with a clean wizard state.
  const [session, setSession] = React.useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
        className="group flex w-40 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/3 hover:text-foreground sm:w-44"
        style={{ aspectRatio: "1 / 1.28" }}
      >
        <span className="grid size-12 place-items-center rounded-full bg-background text-foreground shadow-soft transition-transform group-hover:scale-105">
          <Plus className="size-6" />
        </span>
        <span className="text-sm font-semibold">Create a room</span>
      </button>

      <CreateRoomDialog
        key={session}
        open={open}
        onOpenChange={setOpen}
        accountType={accountType}
        currentPlan={currentPlan}
        origin={origin}
      />
    </>
  );
}
