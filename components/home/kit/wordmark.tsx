import { cn } from "@/lib/utils";

/** The Tazama microphone, reduced to a clean glyph for small sizes. */
export function MicGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("text-brand", className)}>
      <path d="M4.4 9.2a4 4 0 0 0 0 5.6M19.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2.2a3 3 0 0 0-3 3v5.6a3 3 0 0 0 6 0V5.2a3 3 0 0 0-3-3z" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4.4M8.6 21.6h6.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
