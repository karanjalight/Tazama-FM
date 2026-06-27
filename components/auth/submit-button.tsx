"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Full-width brand submit button with a built-in loading spinner. */
export function SubmitButton({
  loading,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      type="submit"
      variant="brand"
      disabled={loading || props.disabled}
      className={cn("h-11 w-full rounded-xl text-[15px] font-semibold", className)}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
