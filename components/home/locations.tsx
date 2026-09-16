"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { CONTENT, LOCATIONS, type DemoLocation } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { Equalizer, StatusDot } from "./kit/bits";
import { Container, IllustrativeNote, Section, SectionIntro } from "./kit/primitives";
import { useCycle } from "./kit/use-cycle";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------ Kenya dot map ------------------------------ */

/** Simplified Kenya outline, lon/lat, clockwise from Lake Victoria. */
const KENYA: [number, number][] = [
  [34.0, -1.0], [33.93, -0.45], [34.08, 0.25], [34.55, 0.95], [34.9, 1.6], [34.95, 2.5],
  [34.4, 3.0], [33.99, 4.22], [34.4, 4.62], [35.3, 5.0], [35.9, 4.62], [36.9, 4.44],
  [38.1, 3.62], [39.3, 3.47], [40.0, 3.95], [41.1, 3.98], [41.88, 3.95], [40.99, 2.83],
  [40.99, -0.87], [41.56, -1.67], [40.9, -2.2], [40.2, -2.75], [40.05, -3.3], [39.7, -4.05],
  [39.2, -4.68], [37.75, -3.6], [37.6, -3.05],
];

const LON = [33.6, 42.2] as const;
const LAT = [5.3, -5.0] as const;
const W = 430;
const H = 515;
const STEP = 0.24;

const project = ([lon, lat]: [number, number]) => [
  ((lon - LON[0]) / (LON[1] - LON[0])) * W,
  ((LAT[0] - lat) / (LAT[0] - LAT[1])) * H,
];

function inside([x, y]: [number, number]) {
  let hit = false;
  for (let i = 0, j = KENYA.length - 1; i < KENYA.length; j = i++) {
    const [xi, yi] = KENYA[i];
    const [xj, yj] = KENYA[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// Deterministic, computed once at module load — identical on server and client.
const DOTS: [number, number][] = [];
for (let lat = LAT[0]; lat >= LAT[1]; lat -= STEP) {
  for (let lon = LON[0]; lon <= LON[1]; lon += STEP) {
    if (inside([lon, lat])) {
      const [x, y] = project([lon, lat]);
      DOTS.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
  }
}

const PINS = LOCATIONS.map((l) => {
  const [x, y] = project(l.coords);
  return { id: l.id, x: Math.round(x), y: Math.round(y) };
});
const HQ = PINS[0];

export function Locations({ standalone = false }: { standalone?: boolean } = {}) {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: LOCATIONS.length, interval: 3800, amount: 0.4 });
  const totals = LOCATIONS.reduce(
    (acc, l) => ({
      online: acc.online + l.screens.online,
      screens: acc.screens + l.screens.total,
      zones: acc.zones + l.zones.length,
    }),
    { online: 0, screens: 0, zones: 0 },
  );

  return (
    <Section id="locations" tone="snow">
      <Container>
        {standalone ? null : (
        <SectionIntro
          index="07"
          kicker="Multi-location"
          title={
            <>
              One business. Every location. <span className="text-white/40">One control center.</span>
            </>
          }
          body="Run a single café or a chain across the country. Every branch, zone, screen and speaker shows up in the same place."
        />
        )}

        <div ref={ref} className={cn("mt-14 grid gap-4 sm:mt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-5", standalone && "mt-0 sm:mt-0")}>
          {/* Map */}
          <div className="relative overflow-hidden rounded-[24px] bg-ink-2 p-6 ring-1 ring-white/[0.08] sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium">Kilele Kitchen · Kenya</p>
              <IllustrativeNote />
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mt-4 block w-full max-w-[400px]" role="img" aria-label="Map of Kenya with four Kilele Kitchen locations">
              {DOTS.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={2.1} className="fill-white/[0.16]" />
              ))}
              {PINS.slice(1).map((pin) => {
                const mx = (HQ.x + pin.x) / 2;
                const my = Math.min(HQ.y, pin.y) - 40;
                return (
                  <path
                    key={pin.id}
                    d={`M${HQ.x} ${HQ.y} Q${mx} ${my} ${pin.x} ${pin.y}`}
                    fill="none"
                    stroke="rgb(255 255 255 / 0.3)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                );
              })}
              {PINS.map((pin, i) => {
                const active = i === index;
                const loc = LOCATIONS[i];
                const labelLeft = pin.x > W * 0.6;
                return (
                  <g key={pin.id} className="cursor-pointer" onClick={() => select(i)}>
                    {active ? (
                      <motion.circle
                        key={`ping-${index}`}
                        cx={pin.x}
                        cy={pin.y}
                        r={8}
                        fill="var(--color-brand)"
                        initial={{ opacity: 0.45, scale: 1 }}
                        animate={{ opacity: 0, scale: 3.2 }}
                        transition={{ duration: 1.6, ease: "easeOut", repeat: Infinity }}
                        style={{ transformOrigin: `${pin.x}px ${pin.y}px` }}
                      />
                    ) : null}
                    <circle cx={pin.x} cy={pin.y} r={active ? 7 : 5.5} className={active ? "fill-brand" : "fill-white"} />
                    <circle cx={pin.x} cy={pin.y} r={2.2} className={active ? "fill-white" : "fill-ink"} />
                    <text
                      x={labelLeft ? pin.x - 14 : pin.x + 14}
                      y={pin.y + 4}
                      textAnchor={labelLeft ? "end" : "start"}
                      className={cn("font-display text-[13px]", active ? "fill-white font-semibold" : "fill-white/50")}
                    >
                      {loc.city}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Location list */}
          <div className="overflow-hidden rounded-[24px] bg-ink-2 ring-1 ring-white/[0.08]">
            <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-b border-white/[0.07]">
              {[
                [String(LOCATIONS.length), "Locations"],
                [`${totals.online}/${totals.screens}`, "Screens online"],
                [String(totals.zones), "Zones"],
              ].map(([value, label]) => (
                <div key={label} className="px-4 py-4 sm:px-6 sm:py-5">
                  <p className="font-tech text-[22px] leading-none tracking-[-0.02em] sm:text-[26px]">{value}</p>
                  <p className="mt-2 text-[12.5px] text-white/50">{label}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-white/[0.07]">
              {LOCATIONS.map((loc, i) => (
                <LocationRow key={loc.id} loc={loc} open={i === index} onSelect={() => select(i)} />
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function LocationRow({ loc, open, onSelect }: { loc: DemoLocation; open: boolean; onSelect: () => void }) {
  const allUp = loc.screens.online === loc.screens.total;
  const panelId = `location-${loc.id}`;
  return (
    <li className={cn("transition-colors", open && "bg-white/[0.03]")}>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-6"
      >
        <span className={cn("h-8 w-[2px] shrink-0 rounded-full transition-colors", open ? "bg-brand" : "bg-transparent")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">{loc.name}</span>
          <span className="block text-[13px] text-white/50">{loc.city}</span>
        </span>
        <span className="flex items-center gap-1.5 font-tech text-[12.5px] text-white/60">
          <StatusDot state={allUp ? "online" : "warning"} />
          {loc.screens.online}/{loc.screens.total}
        </span>
        <ChevronDown aria-hidden className={cn("size-4 text-white/35 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 pb-5 pl-[34px] text-[13px] sm:px-6 sm:pl-[42px]">
              <div>
                <dt className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Screens</dt>
                <dd className="mt-1">
                  {loc.screens.online} of {loc.screens.total} online
                  {!allUp ? <span className="text-white/50"> · 1 reconnecting</span> : null}
                </dd>
              </div>
              <div>
                <dt className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Zones</dt>
                <dd className="mt-1 truncate">{loc.zones.join(", ")}</dd>
              </div>
              <div>
                <dt className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Audio</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Equalizer bars={3} className="h-3" barClassName="w-[2px]" />
                  {loc.playlist}
                </dd>
              </div>
              <div>
                <dt className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Content</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="relative block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] bg-white/10">
                    <Image src={CONTENT[loc.content].thumb} alt="" fill sizes="24px" className="object-cover" />
                  </span>
                  <span className="truncate">{CONTENT[loc.content].title}</span>
                </dd>
              </div>
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
