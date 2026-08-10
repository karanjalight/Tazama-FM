"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { blockUserAction, unblockUserAction } from "@/lib/social/actions";
import { cn } from "@/lib/utils";

export function BlockButton({
  targetUserId,
  initiallyBlocked,
}: {
  targetUserId: string;
  initiallyBlocked: boolean;
}) {
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !blocked;
    startTransition(async () => {
      const action = next ? blockUserAction : unblockUserAction;
      const res = await action(targetUserId);
      if (res.ok) {
        setBlocked(next);
        toast.success(next ? "User blocked." : "User unblocked.");
      } else {
        toast.error("Couldn't update that — try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        blocked
          ? "border-border text-muted-foreground hover:bg-muted"
          : "border-border text-foreground hover:border-foreground/40",
      )}
    >
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
