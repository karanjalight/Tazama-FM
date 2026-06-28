import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * Shared dark hero for the marketing pages (How it works, Business, Pricing).
 * Mirrors the landing hero's ink band + red-accent display headline so every
 * page reads as the same product. The fixed SiteHeader is transparent over a
 * dark surface, so each marketing page opens with this band. Decorative vinyl
 * backdrop only — no imagery (CSS/SVG, per brief).
 */
export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  actions,
  align = "left",
  className,
}: {
  eyebrow?: string;
  /** Pass JSX so pages can append the red headline period: `…<span className="text-brand">.</span>` */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-ink text-white",
        className,
      )}
    >
      <HeroBackdrop />
      <div
        className={cn(
          "relative z-10 mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-8 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-32",
          centered && "text-center",
        )}
      >
        <div className={cn(centered ? "mx-auto max-w-3xl" : "max-w-2xl")}>
          {eyebrow && (
            <Reveal>
              <p className="text-sm font-semibold tracking-wider text-white/45 uppercase">
                {eyebrow}
              </p>
            </Reveal>
          )}
          <Reveal delay={0.05}>
            <h1 className="text-display mt-4 text-4xl font-semibold sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          </Reveal>
          {subtitle && (
            <Reveal delay={0.1}>
              <p
                className={cn(
                  "mt-6 text-lg leading-relaxed text-white/70 sm:text-xl",
                  centered ? "mx-auto max-w-2xl" : "max-w-xl",
                )}
              >
                {subtitle}
              </p>
            </Reveal>
          )}
          {actions && (
            <Reveal delay={0.15}>
              <div
                className={cn(
                  "mt-9 flex flex-wrap items-center gap-3",
                  centered && "justify-center",
                )}
              >
                {actions}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

/** Faint concentric "vinyl" rings — quiet depth without imagery or gradients. */
function HeroBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        className="absolute -right-28 -bottom-44 h-[34rem] w-[34rem] text-white/[0.05]"
        viewBox="0 0 200 200"
        fill="none"
      >
        {[92, 74, 56, 38, 20].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 top-0 h-px bg-white/5" />
    </div>
  );
}
