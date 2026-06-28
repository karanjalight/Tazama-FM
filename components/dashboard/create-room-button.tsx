"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { CreateRoomDialog } from "@/components/rooms/create-room-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/lib/billing/plans";

/**
 * Brand "Create a room" button that opens the create-room wizard. Used by the
 * desktop + mobile sidebars (and any empty-state CTA). `onOpen` lets a wrapping
 * surface (e.g. the mobile drawer) close itself before the dialog appears.
 */
export function CreateRoomButton({
  accountType,
  currentPlan,
  origin,
  className,
  children,
  onOpen,
}: {
  accountType: "individual" | "business" | null;
  currentPlan: SubscriptionPlan;
  origin: string;
  className?: string;
  children?: React.ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  // Bump on each open so the dialog remounts with a clean wizard state.
  const [session, setSession] = React.useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setSession((s) => s + 1);
          setOpen(true);
        }}
        className={cn(
          buttonVariants({ variant: "brand" }),
          "h-10 w-full justify-start gap-2 rounded-xl px-3 text-[14px]",
          className,
        )}
      >
        <Plus className="size-4" />
        {children ?? "Create a room"}
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
