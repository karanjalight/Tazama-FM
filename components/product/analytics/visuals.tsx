"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Lightbulb, Megaphone, TrendingUp, Users } from "lucide-react";

import { Equalizer, StatusDot } from "@/components/home/kit/bits";
import { AppWindow } from "@/components/home/kit/frames";
import { useCycle, useTick } from "@/components/home/kit/use-cycle";
import { LOCATIONS, PLAYLISTS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

/*
 * Reporting replicas scoped to what Tazama measures today: live screen status
 * (device heartbeats), what's playing, who's listening, announcements sent,
 * and advertising — ad plays counted from screens, with views, reach and
 * revenue shown as labelled estimates. Numbers are illustrative.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase", className)}>{children}</p>;
}

function EstimateTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 font-tech text-[9.5px] tracking-[0.08em] text-white/50 uppercase">
      Est.
    </span>
  );
}

/* ------------------------------ Shared pieces ------------------------------ */

const SCREEN_ROWS = LOCATIONS.map((l) => ({
  id: l.id,
  name: l.name,
  city: l.city,
  online: l.screens.online,
  offline: l.screens.total - l.screens.online,
  pending: 0,
  playlist: l.playlist,
}));

const HEAT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEAT_HOURS = Array.from({ length: 13 }, (_, i) => 10 + i); // 10:00–22:00
/** Deterministic illustrative ad plays per weekday × hour. */
const HEAT = HEAT_DAYS.map((_, d) =>
  HEAT_HOURS.map((h) => {
    const lunch = Math.exp(-((h - 13) ** 2) / 3);
    const evening = Math.exp(-((h - 19) ** 2) / 4) * (d >= 4 ? 1.5 : 1);
    return Math.round((lunch * 9 + evening * 12 + ((d * 7 + h * 3) % 4)) * (d >= 5 ? 1.2 : 1));
  }),
);
const HEAT_MAX = Math.max(...HEAT.flat());

export function PlaysHeatmap({ compact = false }: { compact?: boolean }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  return (
    <div className="relative">
      <div className="grid grid-cols-[34px_1fr] gap-2">
        <div className="grid" style={{ gridTemplateRows: `repeat(${HEAT_DAYS.length}, minmax(0, 1fr))` }}>
          {HEAT_DAYS.map((d) => (
            <span key={d} className="flex items-center text-[11px] text-white/40">
              {d}
            </span>
          ))}
        </div>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${HEAT_HOURS.length}, minmax(0, 1fr))` }}
          onPointerLeave={() => setHover(null)}
        >
          {HEAT.map((row, d) =>
            row.map((v, h) => {
              const t = v / HEAT_MAX;
              return (
                <span
                  key={`${d}-${h}`}
                  onPointerEnter={() => setHover({ d, h })}
                  className={cn("rounded-[3px] ring-inset transition-shadow", compact ? "h-4" : "h-6", hover?.d === d && hover?.h === h && "ring-2 ring-white")}
                  style={{ backgroundColor: `color-mix(in oklab, var(--color-brand) ${Math.round(8 + t * 92)}%, rgb(255 255 255 / 0.04))` }}
                />
              );
            }),
          )}
        </div>
        <span />
        <div className="flex justify-between font-tech text-[10px] text-white/30">
          <span>10:00</span>
          <span>16:00</span>
          <span>22:00</span>
        </div>
      </div>
      {hover ? (
        <p className="pointer-events-none absolute -top-8 right-0 rounded-md bg-white px-2 py-1 text-[11.5px] text-ink shadow-lg">
          {HEAT_DAYS[hover.d]} {HEAT_HOURS[hover.h]}:00 · <span className="font-tech">{HEAT[hover.d][hover.h]}</span> ad plays
        </p>
      ) : null}
      <table className="sr-only">
        <caption>Ad plays by weekday and hour (illustrative)</caption>
        <tbody>
          {HEAT.map((row, d) => (
            <tr key={HEAT_DAYS[d]}>
              <th scope="row">{HEAT_DAYS[d]}</th>
              {row.map((v, h) => (
                <td key={h}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBar({ online, pending, offline }: { online: number; pending: number; offline: number }) {
  const total = online + pending + offline;
  return (
    <span className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full">
      {online ? <span className="h-full rounded-full bg-live" style={{ width: `${(online / total) * 100}%` }} /> : null}
      {pending ? <span className="h-full rounded-full bg-white/40" style={{ width: `${(pending / total) * 100}%` }} /> : null}
      {offline ? <span className="h-full rounded-full bg-amber-400" style={{ width: `${(offline / total) * 100}%` }} /> : null}
    </span>
  );
}

/* ------------------------------ Hero window ------------------------------ */

const CAMPAIGNS = [
  { name: "The new season", plays: 1284, completion: 93, views: 18400 },
  { name: "Happy hour", plays: 962, completion: 89, views: 12900 },
  { name: "Weekend brunch", plays: 860, completion: 91, views: 9900 },
];

export function ReportingWindow() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: 2, interval: 6000, amount: 0.25 });
  const tab = index === 0 ? "overview" : "advertising";

  return (
    <div ref={ref}>
      <AppWindow path={["Kilele Kitchen", tab === "overview" ? "Overview" : "Ad performance"]} bodyClassName="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Reports">
          {(["Live status", "Advertising"] as const).map((label, i) => (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={index === i}
              onClick={() => select(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                index === i ? "bg-white/[0.09] text-white" : "text-white/45 hover:text-white/80",
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-white/40">
            {tab === "overview" ? (
              <>
                <StatusDot pulse /> Live
              </>
            ) : (
              "Last 7 days · all locations"
            )}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mt-4"
          >
            {tab === "overview" ? <OverviewTab /> : <AdvertisingTab />}
          </motion.div>
        </AnimatePresence>
      </AppWindow>
    </div>
  );
}

function Tile({ label, value, sub, estimate = false }: { label: string; value: string; sub: string; estimate?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07] sm:p-4">
      <p className="flex items-center gap-1.5 text-[12px] text-white/45">
        {label} {estimate ? <EstimateTag /> : null}
      </p>
      <p className="mt-2 font-tech text-[22px] leading-none tracking-[-0.02em] sm:text-[26px]">{value}</p>
      <p className="mt-2 text-[11.5px] text-white/40">{sub}</p>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Screens online" value="18/19" sub="95% · 1 offline" />
        <Tile label="Locations" value="4" sub="All reporting in" />
        <Tile label="Announcements" value="6" sub="Sent today" />
        <Tile label="Listening now" value="23" sub="Guests joined from their phones" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium">Screen status by location</p>
            <span className="flex items-center gap-3 text-[11px] text-white/45">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-live" /> Online
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-white/40" /> Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-400" /> Offline
              </span>
            </span>
          </div>
          <ul className="mt-4 space-y-3.5">
            {SCREEN_ROWS.map((r) => (
              <li key={r.id} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-[13px]">
                <span className="truncate">{r.name}</span>
                <StatusBar online={r.online} pending={r.pending} offline={r.offline} />
                <span className="text-right font-tech text-[12px] text-white/55">
                  {r.online}/{r.online + r.offline}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12px] text-white/45">
            Offline longest: <span className="text-white/75">Bar TV · Town Centre · 12 min</span>
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
          <p className="text-[14px] font-medium">Now playing across locations</p>
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {SCREEN_ROWS.map((r, i) => {
              const p = PLAYLISTS.find((pl) => pl.name === r.playlist) ?? PLAYLISTS[i % PLAYLISTS.length];
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="relative block size-8 shrink-0 overflow-hidden rounded">
                    <Image src={p.cover} alt="" fill sizes="32px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block truncate">{p.track}</span>
                    <span className="block truncate text-[11.5px] text-white/40">{r.name}</span>
                  </span>
                  <Equalizer bars={3} className="h-3" barClassName="w-[2px]" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AdvertisingTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Ad plays" value="3,106" sub="Counted from screens" />
        <Tile label="Completion" value="91%" sub="Played to the end" />
        <Tile label="Views" value="41.2k" sub="Estimated" estimate />
        <Tile label="Revenue" value="KES 96k" sub="Estimated" estimate />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium">When ads play</p>
            <span className="text-[11.5px] text-white/40">Ad plays by day and hour</span>
          </div>
          <div className="mt-4">
            <PlaysHeatmap compact />
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
          <p className="text-[14px] font-medium">Campaigns</p>
          <table className="mt-3 w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-white/40">
                <th className="py-1.5 font-normal">Campaign</th>
                <th className="py-1.5 text-right font-normal">Plays</th>
                <th className="py-1.5 text-right font-normal">Done</th>
                <th className="py-1.5 text-right font-normal">Views*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {CAMPAIGNS.map((c) => (
                <tr key={c.name}>
                  <td className="truncate py-2.5 pr-2">{c.name}</td>
                  <td className="py-2.5 text-right font-tech">{c.plays.toLocaleString("en-US")}</td>
                  <td className="py-2.5 text-right font-tech text-white/60">{c.completion}%</td>
                  <td className="py-2.5 text-right font-tech text-white/60">{(c.views / 1000).toFixed(1)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-snug text-white/40">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" /> *Views are estimated from room capacity, typical occupancy and attention.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Status board ------------------------------ */

export function StatusBoard() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 1100, amount: 0.35 });
  const phase = tick % 12; // Town Centre's Bar TV drops at 3, reconnects at 8
  const barTvOffline = phase >= 3 && phase < 8;
  const secondsAgo = (phase * 11) % 60;

  const locations = LOCATIONS.map((l) => {
    const screens = Array.from({ length: l.screens.total }, (_, i) => {
      const offline = l.id === "nakuru" && i === l.screens.total - 1 && barTvOffline;
      return { name: i === l.screens.total - 1 && l.id === "nakuru" ? "Bar TV" : `Screen ${i + 1}`, offline };
    });
    return { ...l, screens };
  });

  return (
    <div ref={ref} className="grid gap-3 sm:grid-cols-2">
      {locations.map((l) => {
        const off = l.screens.filter((s) => s.offline).length;
        return (
          <div key={l.id} className={cn("rounded-2xl bg-ink-2 p-4 ring-1 transition-colors duration-500", off ? "ring-amber-400/40" : "ring-white/[0.09]")}>
            <div className="flex items-center justify-between">
              <p className="text-[14.5px] font-medium">
                {l.name} <span className="text-white/40">· {l.city}</span>
              </p>
              <span className="font-tech text-[12px] text-white/55">
                {l.screens.length - off}/{l.screens.length}
              </span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {l.screens.map((s) => (
                <li
                  key={s.name}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] transition-colors duration-500",
                    s.offline ? "bg-amber-400/12 text-amber-200" : "bg-white/[0.04] text-white/60",
                  )}
                >
                  <StatusDot state={s.offline ? "warning" : "online"} />
                  {s.name}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-white/35">
              {off ? "Bar TV stopped checking in" : `Last check-in ${secondsAgo}s ago`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Ad plays panel ------------------------------ */

const BREAKDOWN = {
  Location: [
    ["Westlands", 1190],
    ["Nyali", 884],
    ["Milimani", 612],
    ["Town Centre", 420],
  ],
  Room: [
    ["Dining room · Westlands", 702],
    ["Beach deck · Nyali", 518],
    ["Bar · Westlands", 488],
    ["Café · Milimani", 402],
  ],
  Screen: [
    ["Main Screen · Westlands", 540],
    ["Entrance · Nyali", 431],
    ["Bar TV · Westlands", 402],
    ["Garden TV · Milimani", 318],
  ],
} as const;

export function AdPlaysPanel() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: 3, interval: 3400, amount: 0.35 });
  const { ref: countRef, tick } = useTick<HTMLDivElement>({ interval: 900, amount: 0.3 });
  const keys = Object.keys(BREAKDOWN) as (keyof typeof BREAKDOWN)[];
  const rows = BREAKDOWN[keys[index]];
  const max = rows[0][1];

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div ref={countRef} className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/[0.09]">
        <Label>Ad plays · this week</Label>
        <p className="mt-3 font-tech text-[44px] leading-none tracking-[-0.03em] tabular-nums">{(3106 + tick).toLocaleString("en-US")}</p>
        <p className="mt-2 text-[13px] text-white/50">Each one counted when a screen plays the ad.</p>
        <div className="mt-6 space-y-3">
          {CAMPAIGNS.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-[13px]">
                <span>{c.name}</span>
                <span className="font-tech text-white/60">{c.completion}% complete</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-white/70" style={{ width: `${c.completion}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/[0.09]">
        <div className="flex gap-1" role="tablist" aria-label="Break down ad plays by">
          {keys.map((k, i) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={i === index}
              onClick={() => select(i)}
              className={cn("rounded-lg px-3 py-1.5 text-[13px] transition-colors", i === index ? "bg-white/[0.09]" : "text-white/45 hover:text-white/80")}
            >
              By {k.toLowerCase()}
            </button>
          ))}
        </div>
        <ul className="mt-4 space-y-3">
          {rows.map(([name, plays]) => (
            <li key={name} className="text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="truncate">{name}</span>
                <span className="font-tech text-white/60">{plays.toLocaleString("en-US")}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  key={`${keys[index]}-${name}`}
                  className="h-full origin-left rounded-full bg-brand"
                  style={{ width: `${(plays / max) * 100}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <Label>When ads play</Label>
          <div className="mt-3">
            <PlaysHeatmap compact />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Estimate explainer ---------------------------- */

const ROOMS = [
  { name: "Dining room · Westlands", capacity: 60 },
  { name: "Bar · Westlands", capacity: 24 },
  { name: "Beach deck · Nyali", capacity: 40 },
];
/** Illustrative typical occupancy by hour for a restaurant. */
const OCCUPANCY: Record<number, number> = { 9: 25, 11: 40, 13: 85, 15: 45, 17: 55, 19: 90, 21: 70 };
const ATTENTION = 0.65;

export function EstimateExplainer() {
  const [room, setRoom] = useState(0);
  const hours = Object.keys(OCCUPANCY).map(Number);
  const [hourIndex, setHourIndex] = useState(2);
  const hour = hours[hourIndex];
  const occupancy = OCCUPANCY[hour];
  const views = ROOMS[room].capacity * (occupancy / 100) * ATTENTION;

  return (
    <div className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/[0.09] sm:p-6">
      <div className="flex flex-wrap gap-1.5">
        {ROOMS.map((r, i) => (
          <button
            key={r.name}
            type="button"
            onClick={() => setRoom(i)}
            aria-pressed={room === i}
            className={cn("rounded-lg px-3 py-1.5 text-[13px] transition-colors", room === i ? "bg-white/[0.09]" : "text-white/45 hover:text-white/80")}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {[
          { label: "Room capacity", value: `${ROOMS[room].capacity}`, note: "from Rooms & Zones" },
          { label: `Occupancy at ${hour}:00`, value: `${occupancy}%`, note: "typical for this hour" },
          { label: "Attention", value: "65%", note: "people who notice" },
        ].map((f, i) => (
          <div key={f.label} className="contents">
            {i > 0 ? <span className="hidden text-center font-tech text-white/35 sm:block">×</span> : null}
            <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
              <p className="text-[11.5px] text-white/45">{f.label}</p>
              <p className="mt-1.5 font-tech text-[22px] leading-none">{f.value}</p>
              <p className="mt-1.5 text-[11px] text-white/35">{f.note}</p>
            </div>
          </div>
        ))}
        <span className="hidden text-center font-tech text-white/35 sm:block">=</span>
        <div className="rounded-xl bg-brand/12 p-3.5 ring-1 ring-brand/40">
          <p className="flex items-center gap-1.5 text-[11.5px] text-white/60">
            Views per play <EstimateTag />
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={views.toFixed(1)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 font-tech text-[22px] leading-none"
            >
              {views.toFixed(1)}
            </motion.p>
          </AnimatePresence>
          <p className="mt-1.5 text-[11px] text-white/45">shown next to the number</p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="flex justify-between text-[12.5px] text-white/50">
          <span>Time of day</span>
          <span className="font-tech text-white/80">{hour}:00</span>
        </span>
        <input
          type="range"
          min={0}
          max={hours.length - 1}
          value={hourIndex}
          onChange={(e) => setHourIndex(Number(e.target.value))}
          className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
          aria-label="Time of day"
        />
      </label>
    </div>
  );
}

/* --------------------------------- Insights --------------------------------- */

const INSIGHTS = [
  { icon: TrendingUp, title: "Peak ad hour", body: "7pm–8pm delivers the most estimated views (18% of the week). Weight high-value campaigns toward it." },
  { icon: Users, title: "Strongest room", body: "Dining room (Westlands) earned an estimated 9,120 views from 702 plays." },
  { icon: Megaphone, title: "Best completion", body: "The new season plays to the end 93% of the time across 1,284 plays." },
  { icon: Lightbulb, title: "Plays are up", body: "12% more ad plays than the previous period (2,773 → 3,106)." },
];

export function InsightCards() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {INSIGHTS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="rounded-2xl bg-ink-2 p-5 ring-1 ring-white/[0.09]">
          <span className="grid size-9 place-items-center rounded-lg bg-white/[0.05] text-white/70 ring-1 ring-white/[0.08]">
            <Icon aria-hidden className="size-4" />
          </span>
          <p className="mt-4 text-[15px] font-medium">{title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{body}</p>
        </li>
      ))}
    </ul>
  );
}
