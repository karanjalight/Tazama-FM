import { cn } from "@/lib/utils";
import Image from "next/image";
/**
 * Tazama brand mark — inline SVG so it themes with text color:
 * the wordmark + stand use `currentColor` (flips white-on-dark / ink-on-light),
 * while the microphone stays brand red. Decorative; label the wrapping link.
 */

function MicMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("text-brand", className)}
    >
      {/* side soundwaves */}
      <path
        d="M4.4 9.2a4 4 0 0 0 0 5.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M19.6 9.2a4 4 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* mic capsule */}
      <path
        d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"
        fill="currentColor"
      />
      {/* grille lines */}
      <g stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.95">
        <line x1="10" y1="5.4" x2="14" y2="5.4" />
        <line x1="10" y1="7.5" x2="14" y2="7.5" />
        <line x1="10" y1="9.6" x2="14" y2="9.6" />
      </g>
      {/* cradle */}
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* stem + base */}
      <line
        x1="12"
        y1="18"
        x2="12"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="22"
        x2="16"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  markClassName,
}: {
  className?: string;
  showWordmark?: boolean;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/brand/logo.png" alt="Tazama" className="lg:h-14 h-9 w-auto dark:invert object-contain" width={98} height={98} />
    </span>
  );
}
