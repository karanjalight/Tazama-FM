import { cn } from "@/lib/utils";
import { MicGlyph } from "./wordmark";

/**
 * A wall-mounted display. The inner surface is a size container, so anything
 * rendered inside (kit/signage.tsx) sizes itself in `cqw` and scales with the
 * screen — a 1200px hero screen and a 90px thumbnail show the same layout.
 */
export function ScreenFrame({
  orientation = "landscape",
  surface = "dark",
  className,
  innerClassName,
  children,
}: {
  orientation?: "landscape" | "portrait";
  /** The section the screen sits on — tunes the drop shadow. */
  surface?: "dark" | "light";
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[10px] bg-[#060606] p-[3px] ring-1 sm:p-[4px]",
        surface === "dark"
          ? "shadow-[0_40px_90px_-35px_rgba(0,0,0,0.95)] ring-white/[0.08]"
          : "shadow-[0_30px_70px_-30px_rgba(10,10,10,0.45)] ring-black/10",
        className,
      )}
    >
      <div
        className={cn(
          "@container relative overflow-hidden rounded-[7px] bg-black",
          orientation === "landscape" ? "aspect-video" : "aspect-[9/16]",
          innerClassName,
        )}
      >
        {children}
        {/* glass sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/[0.07] via-transparent via-35% to-transparent"
        />
      </div>
    </div>
  );
}

export function PhoneFrame({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[2.1rem] bg-[#0b0b0c] p-[6px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10",
        className,
      )}
    >
      <div
        className={cn(
          "@container relative aspect-[9/19] overflow-hidden rounded-[1.75rem] bg-white text-ink",
          innerClassName,
        )}
      >
        <span
          aria-hidden
          className="absolute top-[2.6cqw] left-1/2 z-20 h-[6.5cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black"
        />
        {children}
      </div>
    </div>
  );
}

/** App chrome around a product replica. */
export function AppWindow({
  tone = "dark",
  path,
  note = "Illustrative data",
  className,
  bodyClassName,
  children,
}: {
  tone?: "dark" | "light";
  /** Breadcrumb in the title bar, e.g. ["Kilele Kitchen", "Overview"]. */
  path: string[];
  note?: string | null;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl ring-1",
        dark
          ? "bg-ink-2 text-white shadow-[0_60px_140px_-50px_rgba(0,0,0,1)] ring-white/[0.09]"
          : "bg-white text-ink shadow-[0_50px_120px_-50px_rgba(10,10,10,0.35)] ring-black/[0.08]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-11 items-center justify-between gap-4 border-b px-4",
          dark ? "border-white/[0.07] bg-white/[0.015]" : "border-black/[0.06] bg-zinc-50/80",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
          <MicGlyph className="size-4 shrink-0" />
          {path.map((segment, i) => (
            <span key={segment} className="flex min-w-0 items-center gap-2.5">
              {i > 0 ? (
                <span aria-hidden className={dark ? "text-white/20" : "text-zinc-300"}>
                  /
                </span>
              ) : null}
              <span
                className={cn(
                  "truncate",
                  i === path.length - 1
                    ? dark
                      ? "text-white"
                      : "text-ink"
                    : dark
                      ? "text-white/45"
                      : "text-zinc-500",
                )}
              >
                {segment}
              </span>
            </span>
          ))}
        </div>
        {note ? (
          <span
            className={cn(
              "hidden shrink-0 font-tech text-[10.5px] tracking-[0.06em] uppercase sm:inline",
              dark ? "text-white/30" : "text-zinc-400",
            )}
          >
            {note}
          </span>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
