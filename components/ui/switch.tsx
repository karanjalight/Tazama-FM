"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-muted transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "data-checked:bg-(--switch-accent,var(--color-brand-strong))",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4.5 translate-x-1 rounded-full bg-white shadow-sm transition-transform",
          "data-checked:translate-x-4.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
