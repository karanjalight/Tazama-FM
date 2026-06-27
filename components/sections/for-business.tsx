import { Reveal } from "@/components/motion/reveal";
import { SectionIcon } from "@/components/section-icon";
import { Equalizer } from "@/components/brand/equalizer";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { businessFeatures } from "@/lib/data";
import { hashString } from "@/lib/cover-seed";
import { cn } from "@/lib/utils";

export function ForBusiness() {
  return (
    <section id="business" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] bg-ink text-white dark:bg-zinc-900 dark:ring-1 dark:ring-inset dark:ring-white/10">
            <div className="grid items-center gap-12 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
              <div>
                <p className="text-sm font-semibold tracking-wider text-white/45 uppercase">
                  Tazama for Business
                </p>
                <h2 className="text-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Set the mood.
                  <br />
                  Stay legal.
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-white/65">
                  Licensed background music for cafés, gyms, and restaurants —
                  with QR-code song requests your customers actually love.
                </p>

                <ul className="mt-9 grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  {businessFeatures.map((f) => (
                    <li key={f.title} className="flex gap-3.5">
                      <span className="mt-0.5 inline-grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                        <SectionIcon name={f.icon} className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{f.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/55">
                          {f.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <a
                    href="#"
                    className={cn(
                      buttonVariants({ size: "xl" }),
                      "border-transparent bg-white text-ink hover:bg-white/90",
                    )}
                  >
                    Tazama for Business
                  </a>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <BusinessVisual />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BusinessVisual() {
  return (
    <div className="w-[280px] -rotate-2 rounded-3xl bg-white dark:bg-red-600 p-6 text-ink shadow-dark sm:w-[330px]">
      <div className="flex items-center justify-between">
        <Logo className="text-ink" markClassName="h-6 w-6" />
        <span className="font-mono text-xs text-zinc-400">Table 7</span>
      </div>

      <div className="mt-5 grid place-items-center rounded-2xl bg-zinc-50 p-6">
        <FauxQR className="size-44" />
      </div>

      <p className="mt-5 text-center text-lg dark:text-white font-semibold tracking-tight">
        Scan to request a song
      </p>
      <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-200">
        Add to the queue from your phone
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-200 p-3">
        <Equalizer className="h-4 dark:invert" />
        <p className="min-w-0 flex-1 truncate text-sm dark:text-white font-medium">
          Now playing · Sauti ya Mji
        </p>
        <span className="font-mono text-xs text-zinc-400">3:58</span>
      </div>
    </div>
  );
}

/** Deterministic QR-style illustration (decorative — not a scannable code). */
function FauxQR({ className }: { className?: string }) {
  const N = 21;
  const inFinder = (r: number, c: number) => {
    const box = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return box(0, 0) || box(0, N - 7) || box(N - 7, 0);
  };
  const modules: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (inFinder(r, c)) continue;
      if (hashString(`${r}:${c}`) % 100 < 47) {
        modules.push(
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0a0a0a" />,
        );
      }
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0a0a0a" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#ffffff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0a0a0a" />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${N} ${N}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code to request a song"
    >
      <rect width={N} height={N} fill="#ffffff" />
      {modules}
      {finder(0, 0)}
      {finder(0, N - 7)}
      {finder(N - 7, 0)}
    </svg>
  );
}
