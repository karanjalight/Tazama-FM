"use client";

import { useEffect, useReducer, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  AudioLines,
  BarChart3,
  Building2,
  CalendarClock,
  DoorOpen,
  FileText,
  LayoutDashboard,
  Library,
  ListMusic,
  Megaphone,
  MonitorPlay,
  Rows3,
  Search,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { CONTENT, LOCATIONS, PLAYLISTS, type ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { Equalizer, StatusDot } from "./kit/bits";
import { AppWindow, ScreenFrame } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { ScreenSwap } from "./kit/signage";

const STEP_MS = 4200;
const RESUME_AFTER_MS = 12000;

/** A session pairs a playlist with what the main screen shows. */
const SESSIONS: { playlist: number; content: ContentId; block: number }[] = [
  { playlist: 0, content: "breakfast-menu", block: 0 },
  { playlist: 1, content: "lunch-menu", block: 1 },
  { playlist: 2, content: "happy-hour", block: 3 },
  { playlist: 3, content: "brand-film", block: 4 },
];

interface FeedEvent {
  id: number;
  who: "schedule" | "you" | "system";
  text: string;
}

const SEED_EVENTS: FeedEvent[] = [
  { id: -1, who: "system", text: "Bar TV came online · Nyali" },
  { id: -2, who: "you", text: "Scheduled “Last orders” for 22:30 · Westlands" },
  { id: -3, who: "system", text: "Happy hour approved for all locations" },
];

interface State {
  session: number;
  events: FeedEvent[];
  seq: number;
  manualAt: number | null;
}

type Action = { type: "auto" } | { type: "pick"; session: number; at: number } | { type: "resume" };

function reducer(state: State, action: Action): State {
  if (action.type === "resume") return { ...state, manualAt: null };
  const session = action.type === "auto" ? (state.session + 1) % SESSIONS.length : action.session;
  if (session === state.session) return action.type === "pick" ? { ...state, manualAt: action.at } : state;
  const playlist = PLAYLISTS[SESSIONS[session].playlist];
  const event: FeedEvent =
    action.type === "auto"
      ? { id: state.seq, who: "schedule", text: `Schedule switched Westlands to ${playlist.name}` }
      : { id: state.seq, who: "you", text: `You changed Westlands to ${playlist.name}` };
  return {
    session,
    seq: state.seq + 1,
    events: [event, ...state.events].slice(0, 4),
    manualAt: action.type === "pick" ? action.at : state.manualAt,
  };
}

export function ControlCenter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(reducer, { session: 1, events: SEED_EVENTS, seq: 0, manualAt: null });

  const running = inView && !reduced && state.manualAt === null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => dispatch({ type: "auto" }), STEP_MS);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (state.manualAt === null) return;
    const id = window.setTimeout(() => dispatch({ type: "resume" }), RESUME_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [state.manualAt]);

  const session = SESSIONS[state.session];

  return (
    <Section id="control-center" tone="dark" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="03"
          kicker="Control center"
          title="Meet the control center."
          body="Manage your screens, audio, content and locations from one place — and see every change land."
        />

        <div ref={ref} className="relative mt-14 sm:mt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-20 -top-24 h-[480px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgb(229_52_46/0.10),transparent_70%)]"
          />
          <AppWindow path={["Kilele Kitchen", "Overview"]} className="relative" bodyClassName="grid lg:grid-cols-[216px_1fr]">
            <Sidebar />
            <div className="min-w-0 space-y-4 p-4 sm:p-6">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">Good afternoon</p>
                  <p className="mt-0.5 text-[13px] text-white/45">Here’s what’s happening across Kilele Kitchen today.</p>
                </div>
                <div className="hidden h-9 w-64 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[13px] text-white/35 ring-1 ring-white/[0.07] md:flex">
                  <Search aria-hidden className="size-4" />
                  Search screens, content…
                </div>
              </header>

              <Stats />

              <div className="grid gap-4 xl:grid-cols-12">
                <Panel className="xl:col-span-7" title="Live preview" meta={<Breadcrumb />}>
                  <ScreenFrame className="mt-4">
                    <ScreenSwap id={session.content} />
                  </ScreenFrame>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-white/50">
                      Showing <span className="text-white">{CONTENT[session.content].title}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-white/50">
                      <StatusDot pulse />
                      Main Screen online
                    </span>
                  </div>
                </Panel>
                <NowPlaying
                  className="xl:col-span-5"
                  active={state.session}
                  onPick={(i) => dispatch({ type: "pick", session: i, at: Date.now() })}
                />
              </div>

              <Schedule activeBlock={session.block} />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <LocationsPanel className="hidden xl:block" />
                <ContentPerformance className="hidden md:block" />
                <Activity events={state.events} />
              </div>
            </div>
          </AppWindow>
        </div>

        <ul className="mt-12 grid gap-8 border-t border-white/[0.08] pt-10 sm:grid-cols-3">
          {[
            ["See it live", "Preview exactly what any screen is showing right now."],
            ["Change it once", "Switch a playlist or a piece of content and the screens follow."],
            ["Stay ahead", "Today’s schedule, recent activity and screen status in one view."],
          ].map(([title, body]) => (
            <li key={title}>
              <p className="text-[15px] font-medium">{title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* --------------------------------- Chrome --------------------------------- */

const NAV: { label: string; items: [string, LucideIcon][] }[] = [
  {
    label: "Manage",
    items: [
      ["Locations", Building2],
      ["Rooms & Zones", DoorOpen],
      ["Screens & Devices", MonitorPlay],
      ["Audio Zones", AudioLines],
      ["Content Library", Library],
      ["Playlists", ListMusic],
      ["Schedules", CalendarClock],
      ["Announcements", Megaphone],
    ],
  },
  {
    label: "Insights",
    items: [
      ["Analytics", BarChart3],
      ["Audience Insights", UsersRound],
      ["Reports", FileText],
    ],
  },
  {
    label: "Advertising",
    items: [
      ["Campaigns", Target],
      ["Inventory", Rows3],
    ],
  },
];

function Sidebar() {
  return (
    <aside aria-hidden className="hidden border-r border-white/[0.06] bg-white/[0.012] px-3 py-4 lg:block">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span className="grid size-7 place-items-center rounded-md bg-white text-[12px] font-semibold text-ink">K</span>
        <span className="min-w-0 text-[13px] leading-tight">
          <span className="block truncate font-medium">Kilele Kitchen</span>
          <span className="block text-white/40">Owner</span>
        </span>
      </div>
      <p className="mt-4 flex items-center gap-2.5 rounded-lg bg-white/[0.06] px-2.5 py-2 text-[13px] text-white">
        <LayoutDashboard className="size-4 text-brand" />
        Overview
      </p>
      {NAV.map((section) => (
        <div key={section.label} className="mt-4">
          <p className="px-2.5 font-tech text-[10px] tracking-[0.1em] text-white/30 uppercase">{section.label}</p>
          <ul className="mt-1.5 space-y-px">
            {section.items.map(([label, Icon]) => (
              <li key={label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-white/55">
                <Icon className="size-4 text-white/35" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function Panel({
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
    <div className={cn("min-w-0 rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 text-[14px] font-medium">{title}</p>
        <div className="min-w-0 truncate text-right">{meta}</div>
      </div>
      {children}
    </div>
  );
}

function Breadcrumb() {
  return (
    <p className="truncate font-tech text-[11px] text-white/40">
      Westlands <span className="text-white/20">/</span> Ground floor <span className="text-white/20">/</span>{" "}
      <span className="text-white/70">Main Screen</span>
    </p>
  );
}

/* --------------------------------- Panels --------------------------------- */

function Stats() {
  const stats = [
    { label: "Locations", value: "4", sub: "All live", tone: "online" as const },
    { label: "Screens online", value: "18/19", sub: "1 reconnecting", tone: "warning" as const },
    { label: "Audio zones playing", value: "9", sub: "Across 4 locations", tone: "online" as const },
    { label: "Scheduled today", value: "12", sub: "Next at 15:00", tone: "idle" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white/[0.025] p-3.5 ring-1 ring-white/[0.06] sm:p-4">
          <p className="text-[12px] text-white/45">{s.label}</p>
          <p className="mt-2 font-tech text-[22px] leading-none tracking-[-0.02em] sm:text-[26px]">{s.value}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/45">
            <StatusDot state={s.tone} />
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

function NowPlaying({
  active,
  onPick,
  className,
}: {
  active: number;
  onPick: (session: number) => void;
  className?: string;
}) {
  const playlist = PLAYLISTS[SESSIONS[active].playlist];
  return (
    <Panel className={className} title="Now playing" meta={<span className="text-[12px] text-white/40">Westlands · 3 zones</span>}>
      <div className="mt-4 flex items-center gap-3.5">
        <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg">
          <AnimatePresence initial={false}>
            <motion.span
              key={playlist.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image src={playlist.cover} alt="" fill sizes="64px" className="object-cover" />
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{playlist.track}</p>
          <p className="truncate text-[12.5px] text-white/45">{playlist.artist}</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
              <span key={playlist.id} className="block h-full origin-left animate-[tz-progress_40s_linear_both] bg-white/70" />
            </span>
            <Equalizer bars={4} className="h-3" barClassName="w-[2px]" />
          </div>
        </div>
      </div>

      <p className="mt-5 font-tech text-[10px] tracking-[0.1em] text-white/30 uppercase">Switch session</p>
      <ul className="mt-2 space-y-1">
        {SESSIONS.map((s, i) => {
          const p = PLAYLISTS[s.playlist];
          const isActive = i === active;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={isActive}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                  isActive ? "bg-white/[0.07] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <span className="relative block size-7 shrink-0 overflow-hidden rounded-md">
                  <Image src={p.cover} alt="" fill sizes="28px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="hidden truncate text-[11.5px] text-white/35 sm:block">with {CONTENT[s.content].title}</span>
                {isActive ? (
                  <motion.span
                    layoutId="session-indicator"
                    className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-brand"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const BLOCKS = [
  { from: 7, to: 11.5, label: "Breakfast", sub: "Morning Acoustic" },
  { from: 12, to: 15, label: "Lunch", sub: "Lunch Rush" },
  { from: 15, to: 17, label: "Brand film", sub: "Lunch Rush" },
  { from: 17, to: 19, label: "Happy hour", sub: "Golden Hour" },
  { from: 19, to: 23, label: "Evening", sub: "Late Lounge" },
];
const DAY_START = 6;
const DAY_HOURS = 18;
const pct = (h: number) => ((h - DAY_START) / DAY_HOURS) * 100;

function Schedule({ activeBlock }: { activeBlock: number }) {
  return (
    <Panel
      title="Today’s schedule"
      meta={<span className="hidden font-tech text-[11px] text-white/40 sm:inline">Westlands · all screens & zones</span>}
    >
      <div className="relative mt-5">
        <div className="relative h-14">
          {BLOCKS.map((b, i) => (
            <div
              key={b.label}
              className={cn(
                "absolute inset-y-0 overflow-hidden rounded-md px-2 py-1.5 ring-1 transition-colors duration-500",
                i === activeBlock ? "bg-brand/[0.16] ring-brand/50" : "bg-white/[0.035] ring-white/[0.07]",
              )}
              style={{ left: `calc(${pct(b.from)}% + 1px)`, width: `calc(${pct(b.to) - pct(b.from)}% - 2px)` }}
            >
              <p className="truncate text-[12px] font-medium">{b.label}</p>
              <p className="hidden truncate text-[11px] text-white/45 sm:block">{b.sub}</p>
            </div>
          ))}
          <div aria-hidden className="absolute -inset-y-1.5 w-px bg-brand" style={{ left: `${pct(12 + 4 / 60)}%` }}>
            <span className="absolute -top-1 -left-[3px] size-[7px] rounded-full bg-brand" />
          </div>
        </div>
        <div className="mt-2 flex justify-between font-tech text-[10.5px] text-white/30">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function LocationsPanel({ className }: { className?: string }) {
  return (
    <Panel className={className} title="Locations" meta={<span className="text-[12px] text-white/40">4 live</span>}>
      <ul className="mt-3 divide-y divide-white/[0.05]">
        {LOCATIONS.map((l) => {
          const allUp = l.screens.online === l.screens.total;
          return (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <span className="min-w-0">
                <span className="block truncate">{l.name}</span>
                <span className="block text-[11.5px] text-white/40">{l.city}</span>
              </span>
              <span className="flex items-center gap-1.5 font-tech text-[12px] text-white/60">
                <StatusDot state={allUp ? "online" : "warning"} />
                {l.screens.online}/{l.screens.total}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const TOP_CONTENT = [
  { id: "lunch-menu" as const, plays: 1284 },
  { id: "happy-hour" as const, plays: 962 },
  { id: "brand-film" as const, plays: 740 },
  { id: "weekend-brunch" as const, plays: 518 },
];

function ContentPerformance({ className }: { className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const max = TOP_CONTENT[0].plays;
  return (
    <Panel className={className} title="Content performance" meta={<span className="text-[12px] text-white/40">Plays today</span>}>
      <ul ref={ref} className="mt-4 space-y-3.5">
        {TOP_CONTENT.map((c, i) => (
          <li key={c.id} className="text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-white/80">{CONTENT[c.id].title}</span>
              <span className="font-tech text-[12px] text-white/55">{c.plays.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full origin-left rounded-full", i === 0 ? "bg-brand" : "bg-white/35")}
                style={{ width: `${(c.plays / max) * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: seen ? 1 : 0 }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Activity({ events }: { events: FeedEvent[] }) {
  return (
    <Panel title="Recent activity" meta={<span className="text-[12px] text-white/40">Live</span>}>
      <ul className="mt-3">
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 py-2 text-[12.5px]">
                <span
                  aria-hidden
                  className={cn(
                    "mt-[5px] size-1.5 shrink-0 rounded-full",
                    e.who === "you" ? "bg-brand" : e.who === "schedule" ? "bg-white/60" : "bg-live",
                  )}
                />
                <span className="min-w-0 flex-1 leading-snug text-white/75">{e.text}</span>
                <span className="shrink-0 font-tech text-[11px] text-white/30">{i === 0 ? "now" : `${i * 2}m`}</span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Panel>
  );
}
