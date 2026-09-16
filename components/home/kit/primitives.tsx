import { cn } from "@/lib/utils";
import { RevealBelowFold } from "./reveal-below-fold";

/**
 * Section surfaces. Every tone is dark now: "light" and "snow" are two raised
 * graphite bands between the ink ones (names kept for API compatibility), so
 * text and hairlines on them use the same white-on-dark values as "dark".
 */
export type Tone = "dark" | "light" | "snow";

const TONE: Record<Tone, string> = {
  dark: "bg-ink text-white",
  light: "bg-[#141417] text-white border-y border-white/[0.06]",
  snow: "bg-[#18181b] text-white border-y border-white/[0.06]",
};

export function Container({
  className,
  children,
  wide = false,
}: {
  className?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        wide ? "max-w-[1320px]" : "max-w-[1200px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  id,
  tone,
  className,
  children,
  label,
}: {
  id?: string;
  tone: Tone;
  className?: string;
  children: React.ReactNode;
  /** Accessible name when the section has no visible heading. */
  label?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      data-tone={tone}
      className={cn(
        "relative scroll-mt-16 py-24 sm:py-32 lg:py-40",
        TONE[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

/** "02 / Platform" — the chapter marker that keeps the story navigable. */
export function Kicker({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  /** Unused: every section surface is dark. Kept for API compatibility. */
  tone?: Tone;
  className?: string;
}) {
  return (
    <p className={cn("font-tech text-[12px] tracking-[0.12em] text-white/50 uppercase", className)}>
      {index ? (
        <>
          <span className="text-brand">{index}</span>
          <span aria-hidden className="mx-2 opacity-40">
            /
          </span>
        </>
      ) : null}
      {children}
    </p>
  );
}

export function SectionIntro({
  index,
  kicker,
  title,
  body,
  align = "left",
  className,
  aside,
}: {
  index?: string;
  kicker: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Unused: every section surface is dark. Kept for API compatibility. */
  tone?: Tone;
  align?: "left" | "center";
  className?: string;
  /** Right-hand slot on wide screens (left-aligned intros only). */
  aside?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <RevealBelowFold
      className={cn(
        aside && !centered && "lg:flex lg:items-end lg:justify-between lg:gap-16",
        centered && "mx-auto text-center",
        className,
      )}
    >
      <div className={cn(centered ? "mx-auto max-w-[980px]" : "max-w-3xl")}>
        <Kicker index={index}>{kicker}</Kicker>
        <h2 className="mt-5 font-display text-[38px] leading-[1.02] font-semibold tracking-[-0.042em] text-balance sm:text-[52px] lg:text-[64px]">
          {title}
        </h2>
        {body ? (
          <p
            className={cn(
              "mt-6 max-w-xl text-[17px] leading-[1.6] text-pretty text-zinc-400 sm:text-lg",
              centered && "mx-auto",
            )}
          >
            {body}
          </p>
        ) : null}
      </div>
      {aside ? <div className="mt-8 shrink-0 lg:mt-0">{aside}</div> : null}
    </RevealBelowFold>
  );
}

/** Small mono caption flagging demo numbers as illustrative. */
export function IllustrativeNote({
  className,
  children = "Illustrative data",
}: {
  /** Unused: every section surface is dark. Kept for API compatibility. */
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span className={cn("font-tech text-[11px] tracking-[0.06em] text-white/35 uppercase", className)}>{children}</span>
  );
}
