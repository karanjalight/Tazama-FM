import { cn } from "@/lib/utils";

const REACTIONS = [
  { emoji: "❤️", left: "14%", delay: "0s" },
  { emoji: "🔥", left: "50%", delay: "1.2s" },
  { emoji: "❤️", left: "80%", delay: "2.3s" },
];

/**
 * Reactions drifting up and fading — pure CSS (`animate-float-up`), so it stops
 * under reduced-motion (base `opacity-0` keeps it hidden then). Decorative.
 */
export function FloatingReaction({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden",
        className,
      )}
    >
      {REACTIONS.map((r, i) => (
        <span
          key={i}
          className="absolute bottom-3 text-lg opacity-0 animate-float-up"
          style={{ left: r.left, animationDelay: r.delay }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
