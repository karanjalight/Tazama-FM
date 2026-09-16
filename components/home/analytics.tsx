"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, ChevronDown, Download } from "lucide-react";

import { CONTENT, LOCATIONS } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { AppWindow } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";

const EASE = [0.22, 1, 0.36, 1] as const;
const BRAND = "#E5342E";
const REFERENCE = "#71717A"; // neutral comparison series — dashed + labelled, never color alone

/* Illustrative demo data — labelled as such in the window chrome. */
const HOURS = Array.from({ length: 16 }, (_, i) => 8 + i);
const TODAY = [120, 210, 340, 520, 880, 1240, 1180, 760, 540, 610, 820, 1120, 1380, 1260, 900, 520];
const LAST_WEEK = [140, 190, 300, 480, 760, 1050, 1100, 700, 520, 580, 700, 980, 1190, 1150, 860, 480];

const KPIS = [
  { label: "Content plays", value: "48,210", delta: "12%" },
  { label: "Estimated reach", value: "21.4k", delta: "8%" },
  { label: "Guest requests", value: "342", delta: "21%" },
  { label: "Screens healthy", value: "18/19", delta: null },
];

const TOP = [
  { id: "lunch-menu" as const, plays: 9840 },
  { id: "happy-hour" as const, plays: 7310 },
  { id: "brand-film" as const, plays: 5620 },
  { id: "weekend-brunch" as const, plays: 4180 },
  { id: "chefs-special" as const, plays: 2950 },
];

const BY_LOCATION = [18420, 13960, 9230, 6600];

const CAMPAIGNS = [
  { name: "The new season", plays: 3106, flight: 0.64 },
  { name: "Happy hour", plays: 2240, flight: 0.82 },
  { name: "Weekend brunch", plays: 1480, flight: 0.35 },
];

export function Analytics() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.25 });

  return (
    <Section id="analytics" tone="snow" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="11"
          kicker="Analytics"
          tone="light"
          title={
            <>
              Know what’s working<span className="text-brand">.</span>
            </>
          }
          body="See which content gets played, which locations are busiest and how every campaign performs — so your best content runs at your busiest hours."
        />

        <div ref={ref} className="mt-14 sm:mt-20">
          <AppWindow tone="light" path={["Kilele Kitchen", "Analytics"]} bodyClassName="space-y-4 p-4 sm:p-6">
            {/* Filters, one row above the charts */}
            <div className="flex flex-wrap items-center gap-2 text-[13px]" aria-hidden>
              {["Last 7 days", "All locations", "All screens"].map((f) => (
                <span key={f} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 ring-1 ring-black/[0.09]">
                  {f}
                  <ChevronDown className="size-3.5 text-zinc-400" />
                </span>
              ))}
              <span className="ml-auto hidden h-8 items-center gap-1.5 rounded-lg px-3 text-zinc-600 ring-1 ring-black/[0.09] sm:inline-flex">
                <Download className="size-3.5" /> Export report
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {KPIS.map((k) => (
                <div key={k.label} className="rounded-xl bg-white p-4 ring-1 ring-black/[0.07]">
                  <p className="text-[12.5px] text-zinc-500">{k.label}</p>
                  <p className="mt-2 font-tech text-[24px] leading-none tracking-[-0.02em] sm:text-[28px]">{k.value}</p>
                  <p className="mt-2 flex items-center gap-1 text-[12px] text-zinc-500">
                    {k.delta ? (
                      <>
                        <ArrowUpRight aria-hidden className="size-3.5 text-ink" />
                        <span className="text-ink">{k.delta}</span> vs last week
                      </>
                    ) : (
                      "1 reconnecting"
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-8" title="Plays by hour" meta={<Legend />}>
                <PlaysChart seen={seen} />
              </Card>
              <Card className="xl:col-span-4" title="Top content" meta={<span className="text-[12px] text-zinc-400">Plays · 7 days</span>}>
                <TopContent seen={seen} />
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Location activity" meta={<span className="text-[12px] text-zinc-400">Plays · 7 days</span>}>
                <LocationBars seen={seen} />
              </Card>
              <Card title="Campaign performance" meta={<span className="text-[12px] text-zinc-400">Flight progress</span>}>
                <Campaigns seen={seen} />
              </Card>
            </div>
          </AppWindow>
        </div>
      </Container>
    </Section>
  );
}

function Card({
  title,
  meta,
  className,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl bg-white p-4 ring-1 ring-black/[0.07] sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-medium">{title}</p>
        {meta}
      </div>
      {children}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-[12px] text-zinc-600">
      <span className="flex items-center gap-1.5">
        <svg width="16" height="4" aria-hidden>
          <line x1="0" y1="2" x2="16" y2="2" stroke={BRAND} strokeWidth="2" strokeLinecap="round" />
        </svg>
        Today
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="16" height="4" aria-hidden>
          <line x1="0" y1="2" x2="16" y2="2" stroke={REFERENCE} strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        Same day last week
      </span>
    </div>
  );
}

/* ------------------------------- Line chart ------------------------------- */

const CW = 640;
const CH = 240;
const PAD = { l: 40, r: 64, t: 12, b: 26 };
const Y_MAX = 1500;
const xAt = (i: number) => PAD.l + (i / (HOURS.length - 1)) * (CW - PAD.l - PAD.r);
const yAt = (v: number) => PAD.t + (1 - v / Y_MAX) * (CH - PAD.t - PAD.b);
const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
const area = (vals: number[]) => `${line(vals)} L${xAt(vals.length - 1)} ${yAt(0)} L${xAt(0)} ${yAt(0)} Z`;

function PlaysChart({ seen }: { seen: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const last = HOURS.length - 1;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * CW;
    const i = Math.round(((x - PAD.l) / (CW - PAD.l - PAD.r)) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div className="@container relative mt-4">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="block w-full overflow-visible" role="img" aria-label="Line chart of plays by hour, today compared with the same day last week">
        {[0, 500, 1000, 1500].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={CW - PAD.r} y1={yAt(v)} y2={yAt(v)} stroke="rgb(10 10 10 / 0.06)" />
            <text x={PAD.l - 8} y={yAt(v) + 4} textAnchor="end" className="fill-zinc-400 font-tech text-[10px] @max-[520px]:text-[18px]">
              {v === 0 ? "0" : `${v / 1000}k`}
            </text>
          </g>
        ))}
        {HOURS.filter((_, i) => i % 3 === 0).map((h) => (
          <text key={h} x={xAt(h - 8)} y={CH - 6} textAnchor="middle" className="fill-zinc-400 font-tech text-[10px] @max-[520px]:text-[18px]">
            {String(h).padStart(2, "0")}:00
          </text>
        ))}

        <motion.path
          d={area(TODAY)}
          fill={BRAND}
          initial={{ opacity: 0 }}
          animate={{ opacity: seen ? 0.08 : 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.path
          d={line(LAST_WEEK)}
          fill="none"
          stroke={REFERENCE}
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: seen ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={line(TODAY)}
          fill="none"
          stroke={BRAND}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: seen ? 1 : 0 }}
          transition={{ duration: 1.2, ease: EASE }}
        />

        {/* direct labels at the line ends */}
        <text x={xAt(last) + 8} y={yAt(TODAY[last]) + 4} className="fill-ink text-[11px] font-medium @max-[520px]:text-[19px]">Today</text>
        <text x={xAt(last) + 8} y={yAt(LAST_WEEK[last]) + 16} className="fill-zinc-500 text-[11px] @max-[520px]:text-[19px]">Last wk</text>

        {hover !== null ? (
          <g pointerEvents="none">
            <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={CH - PAD.b} stroke="rgb(10 10 10 / 0.25)" />
            <circle cx={xAt(hover)} cy={yAt(LAST_WEEK[hover])} r="4" fill={REFERENCE} stroke="#fff" strokeWidth="2" />
            <circle cx={xAt(hover)} cy={yAt(TODAY[hover])} r="4.5" fill={BRAND} stroke="#fff" strokeWidth="2" />
          </g>
        ) : null}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={CW - PAD.l - PAD.r}
          height={CH - PAD.t - PAD.b}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-[12px] whitespace-nowrap text-white shadow-lg"
          style={{ left: `${(xAt(hover) / CW) * 100}%` }}
        >
          <p className="font-tech text-white/60">{String(HOURS[hover]).padStart(2, "0")}:00</p>
          <p className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: BRAND }} /> Today{" "}
            <span className="ml-auto pl-3 font-tech">{TODAY[hover].toLocaleString("en-US")}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: REFERENCE }} /> Last week{" "}
            <span className="ml-auto pl-3 font-tech">{LAST_WEEK[hover].toLocaleString("en-US")}</span>
          </p>
        </div>
      ) : null}

      <table className="sr-only">
        <caption>Plays by hour (illustrative)</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Today</th>
            <th scope="col">Same day last week</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h, i) => (
            <tr key={h}>
              <th scope="row">{h}:00</th>
              <td>{TODAY[i]}</td>
              <td>{LAST_WEEK[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------- Bars ---------------------------------- */

function TopContent({ seen }: { seen: boolean }) {
  const max = TOP[0].plays;
  const total = TOP.reduce((s, t) => s + t.plays, 0);
  return (
    <ul className="mt-4 space-y-3">
      {TOP.map((t, i) => (
        <li key={t.id} className="group relative text-[13px]" title={`${CONTENT[t.id].title}: ${t.plays.toLocaleString("en-US")} plays (${Math.round((t.plays / total) * 100)}% of top 5)`}>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-zinc-700">{CONTENT[t.id].title}</span>
            <span className="font-tech text-[12px] text-zinc-500">{t.plays.toLocaleString("en-US")}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-zinc-100">
            <motion.div
              className="h-full origin-left rounded-full bg-ink transition-colors group-hover:bg-zinc-600"
              style={{ width: `${(t.plays / max) * 100}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: seen ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: EASE }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LocationBars({ seen }: { seen: boolean }) {
  const max = BY_LOCATION[0];
  return (
    <div className="mt-5 flex h-40 items-end gap-3 sm:gap-5">
      {LOCATIONS.map((loc, i) => (
        <div
          key={loc.id}
          className="group flex h-full flex-1 flex-col justify-end"
          title={`${loc.name}, ${loc.city}: ${BY_LOCATION[i].toLocaleString("en-US")} plays`}
        >
          <span className="mb-1.5 text-center font-tech text-[11px] text-zinc-500">{(BY_LOCATION[i] / 1000).toFixed(1)}k</span>
          <motion.span
            className="mx-auto block w-full max-w-[40px] origin-bottom rounded-t-[4px] bg-ink transition-colors group-hover:bg-zinc-600"
            style={{ height: `${(BY_LOCATION[i] / max) * 78}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: seen ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: EASE }}
          />
          <span className="mt-2 truncate text-center text-[12px] text-zinc-600">{loc.city}</span>
        </div>
      ))}
    </div>
  );
}

function Campaigns({ seen }: { seen: boolean }) {
  return (
    <ul className="mt-4 divide-y divide-black/[0.06]">
      {CAMPAIGNS.map((c, i) => (
        <li key={c.name} className="py-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{c.name}</span>
            <span className="font-tech text-[12px] text-zinc-500">{c.plays.toLocaleString("en-US")} plays</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
              <motion.div
                className="h-full origin-left rounded-full bg-zinc-700"
                style={{ width: `${c.flight * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: seen ? 1 : 0 }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: EASE }}
              />
            </div>
            <span className="w-9 text-right font-tech text-[11px] text-zinc-500">{Math.round(c.flight * 100)}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
