import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The Tazama logo for dark marketing surfaces (header, menu, footer).
 * `logo-on-dark.png` is `logo.png` with neutral tones inverted and the brand
 * red kept as-is — a plain CSS invert would turn the red mic cyan.
 */
export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-on-dark.png"
      alt=""
      width={493}
      height={270}
      priority={priority}
      className={cn("h-11 w-auto", className)}
    />
  );
}
