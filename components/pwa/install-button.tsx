"use client";

import * as React from "react";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall } from "./use-install";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

/**
 * Install CTA. Fires the native prompt on Chromium, shows an "Add to Home
 * Screen" hint on iOS, and renders nothing when install isn't possible
 * (already installed, or an unsupported browser).
 */
export function InstallButton({
  variant = "brand",
  size = "pill",
  label = "Install app",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  className?: string;
}) {
  const { mode, promptInstall } = useInstall();

  if (mode === "loading" || mode === "installed" || mode === "unsupported") {
    return null;
  }

  const onClick =
    mode === "ios"
      ? () =>
          toast("Install Tazama", {
            description: "Tap the Share icon, then “Add to Home Screen”.",
            icon: <Share className="size-4" />,
            duration: 6000,
          })
      : () => void promptInstall();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
    >
      <Download className="size-4" />
      {label}
    </Button>
  );
}
