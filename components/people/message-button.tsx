"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startDmAction } from "@/app/dashboard/chats/actions";

export function MessageButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await startDmAction(targetUserId);
      if (res.ok && res.conversationId) {
        router.push(`/dashboard/chats/${res.conversationId}`);
      } else {
        toast.error("Couldn't start that conversation.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/85 disabled:opacity-60"
    >
      Message
    </button>
  );
}
