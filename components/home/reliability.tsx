"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cast, Globe, Speaker, Tv, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { StatusDot } from "./kit/bits";
import { AppWindow, ScreenFrame } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { useTick } from "./kit/use-cycle";
import { MicGlyph } from "./kit/wordmark";

const TICK_MS = 1600;
const START_SECONDS = 12 * 3600 + 4 * 60 + 10; // 12:04:10
const HAPPY_HOUR = 17 * 3600;

const EVENTS = [
  "Westlands · Main Screen · heartbeat ok",
  "Nyali · Beach Deck speakers · in sync · Golden Hour",
  "Town Centre · Bar TV · reconnecting…",
  "Milimani · Café · session started · Brunch",
  "Westlands · Terrace · announcement played · music lowered",
  "Town Centre · Bar TV · back online",
  "Nyali · Entrance screen · content updated · Happy hour",
  "Westlands · Bar TV · ad break ended · playlist resumed",
  "Milimani · Garden speakers · heartbeat ok",
  "Westlands · Ground Floor · schedule on time",
];

const clock = (seconds: number) => {
  const s = ((seconds % 86400) + 86400) % 86400;
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};

const untilLabel = (seconds: number) => `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`;

export function Reliability() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: TICK_MS, amount: 0.3 });
  const now = START_SECONDS + tick * 2;
  // The Nakuru Bar TV drops and recovers inside every loop of the log.
  const phase = tick % EVENTS.length;
  const reconnecting = phase >= 2 && phase < 5;

  const log = Array.from({ length: 7 }, (_, i) => {
    const n = tick - i;
    return { id: n, time: clock(START_SECONDS + n * 2), text: EVENTS[((n % EVENTS.length) + EVENTS.length) % EVENTS.length] };
  });

  const statuses = [
    {
      label: "Screens online",
      value: reconnecting ? "18 / 19" : "19 / 19",
      sub: reconnecting ? "Town Centre · Bar TV reconnecting" : "All screens online",
      state: reconnecting ? ("warning" as const) : ("online" as const),
    },
    { label: "Audio zones active", value: "9 / 9", sub: "In sync across 4 locations", state: "online" as const },
    { label: "Content playing", value: reconnecting ? "18" : "19", sub: "Screens showing scheduled content", state: "online" as const },
    { label: "Locations connected", value: "4 / 4", sub: "Nairobi · Mombasa · Kisumu · Nakuru", state: "online" as const },
    { label: "Next scheduled", value: "17:00", sub: `Happy hour · all locations · in ${untilLabel(HAPPY_HOUR - now)}`, state: "live" as const },
  ];

  return (
    <Section id="reliability" tone="dark" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="10"
          kicker="Reliability"
          title={
            <>
              Built to keep your business <span className="text-white/40">running.</span>
            </>
          }
          body="Tazama is designed for real businesses, real locations and real-time operation — from the first song in the morning to last orders."
        />

        <div ref={ref} className="mt-14 sm:mt-20">
          <AppWindow path={["Kilele Kitchen", "Status"]} note="Live view · illustrative" bodyClassName="grid lg:grid-cols-[1fr_1.05fr]">
            <ul className="divide-y divide-white/[0.06] lg:border-r lg:border-white/[0.06]">
              {statuses.map((s) => (
                <li key={s.label} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                  <StatusDot state={s.state} pulse={s.state !== "warning"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-white/60">{s.label}</p>
                    <p className="truncate text-[12px] text-white/35">{s.sub}</p>
                  </div>
                  <p
                    className={cn(
                      "font-tech text-[20px] tracking-[-0.02em] tabular-nums sm:text-[24px]",
                      s.state === "warning" && "text-amber-300",
                    )}
                  >
                    {s.value}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/[0.06] p-4 sm:p-6 lg:border-t-0">
              <div className="flex items-center justify-between">
                <p className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Event stream</p>
                <p className="font-tech text-[12px] text-white/45 tabular-nums">{clock(now)}</p>
              </div>
              <ul className="mt-4 h-[252px] overflow-hidden font-tech text-[12px] leading-none" aria-hidden>
                <AnimatePresence initial={false}>
                  {log.map((line, i) => (
                    <motion.li
                      key={line.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1 - i * 0.12, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-3 border-b border-white/[0.04] py-[11px]"
                    >
                      <span className="shrink-0 text-white/30">{line.time}</span>
                      <span
                        className={cn(
                          "truncate",
                          line.text.includes("reconnecting") ? "text-amber-300/90" : i === 0 ? "text-white" : "text-white/60",
                        )}
                      >
                        {line.text}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </AppWindow>
        </div>

        <ul className="mt-12 grid gap-8 border-t border-white/[0.08] pt-10 sm:grid-cols-3">
          {[
            ["Schedules switch on time", "Sessions change by the clock, every day, with no one touching a remote."],
            ["Interruptions hand back cleanly", "Announcements and ads return the music and screens to exactly where they were."],
            ["Status the moment it changes", "See when a screen drops offline — and when it comes back."],
          ].map(([title, body]) => (
            <li key={title}>
              <p className="text-[15px] font-medium">{title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>

        <Hardware />
      </Container>
    </Section>
  );
}

const HARDWARE: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "Any smart TV", body: "Open Tazama on the TVs you already own.", icon: Tv },
  { title: "Android TV box", body: "A simple always-on player for unattended screens.", icon: Cast },
  { title: "Your sound system", body: "Route audio through your existing speakers or amp.", icon: Speaker },
  { title: "Any browser", body: "Run it from a laptop or tablet. Nothing to install.", icon: Globe },
];

function Hardware() {
  return (
    <div id="hardware" className="mt-24 scroll-mt-24 grid items-center gap-10 sm:mt-32 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      <div className="order-2 lg:order-1">
        <ScreenFrame>
          <PairingScreen />
        </ScreenFrame>
      </div>
      <div className="order-1 lg:order-2">
        <p className="font-tech text-[12px] tracking-[0.12em] text-white/50 uppercase">Hardware</p>
        <h3 className="mt-4 font-display text-[30px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[40px]">
          Runs on what you already have.
        </h3>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-zinc-400">
          Open Tazama on a TV and it shows a 4-digit code. Enter it in your dashboard and the screen is connected — no special hardware, no cables to run.
        </p>
        <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {HARDWARE.map(({ title, body, icon: Icon }) => (
            <li key={title} className="flex gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/70 ring-1 ring-white/[0.09]">
                <Icon aria-hidden className="size-4" />
              </span>
              <span>
                <span className="block text-[15px] font-medium">{title}</span>
                <span className="mt-1 block text-[14px] leading-relaxed text-zinc-400">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PairingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0b0c] text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgb(255_255_255/0.06),transparent_70%)]" />
      <MicGlyph className="relative size-[5cqw]" />
      <p className="relative mt-[2.5cqw] text-[2.6cqw] text-white/60">Pair this screen</p>
      <div className="relative mt-[2.5cqw] flex gap-[1.6cqw]">
        {["4", "8", "2", "7"].map((d, i) => (
          <span
            key={i}
            className="grid h-[12cqw] w-[9.5cqw] place-items-center rounded-[1.2cqw] bg-white/[0.06] font-tech text-[7cqw] ring-1 ring-white/15"
          >
            {d}
          </span>
        ))}
      </div>
      <p className="relative mt-[3cqw] text-[1.9cqw] text-white/40">Enter this code in Screens &amp; Devices</p>
    </div>
  );
}
