"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Building2,
  CalendarClock,
  Check,
  CloudUpload,
  Copy,
  DoorOpen,
  Megaphone,
  Mic,
  Pause,
  Play,
  Send,
  Siren,
  Square,
  Volume1,
} from "lucide-react";

import { StatusDot } from "@/components/home/kit/bits";
import { AppWindow, ScreenFrame } from "@/components/home/kit/frames";
import { ScreenContent } from "@/components/home/kit/signage";
import { useCycle, useTick } from "@/components/home/kit/use-cycle";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase", className)}>{children}</p>;
}

/** Deterministic bar heights so server and client render the same waveform. */
const WAVE = Array.from({ length: 64 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.61) * 0.55 + Math.sin(i * 0.23) * 0.35 + Math.sin(i * 1.7) * 0.15);
  return Math.round((0.18 + v * 0.82) * 100) / 100;
});

function Waveform({ progress, live = false, className }: { progress: number; live?: boolean; className?: string }) {
  const shown = Math.round(progress * WAVE.length);
  return (
    <div aria-hidden className={cn("flex h-16 items-center gap-[3px]", className)}>
      {WAVE.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-full rounded-full transition-colors duration-200",
            i < shown ? (live ? "bg-brand" : "bg-white/85") : "bg-white/12",
          )}
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------ Hero composer ------------------------------ */

const CATEGORIES = ["Promotion", "Operational", "Event", "Customer service", "Emergency", "General"];

export function Composer() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 140, amount: 0.25 });
  const rec = (tick % 70) / 60;
  const recording = rec < 1;
  const [mode, setMode] = useState<"pause" | "lower">("lower");
  const [level, setLevel] = useState(20);
  const [when, setWhen] = useState<"now" | "schedule">("schedule");

  return (
    <div ref={ref}>
      <AppWindow path={["Kilele Kitchen", "Announcements", "New announcement"]} bodyClassName="grid lg:grid-cols-3">
        {/* Message */}
        <div className="p-4 sm:p-5">
          <Label>Message</Label>
          <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Last orders</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] ring-1",
                  c === "Operational" ? "bg-white/[0.1] text-white ring-white/20" : "text-white/45 ring-white/[0.07]",
                )}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px]">
                {recording ? (
                  <>
                    <span className="relative flex size-2.5">
                      <span className="absolute inset-0 animate-live-ping rounded-full bg-brand" />
                      <span className="relative size-2.5 rounded-full bg-brand" />
                    </span>
                    Recording
                  </>
                ) : (
                  <>
                    <Check aria-hidden className="size-4 text-live" /> Recorded
                  </>
                )}
              </span>
              <span className="font-tech text-[12px] text-white/55">0:{String(Math.round(Math.min(rec, 1) * 8)).padStart(2, "0")}</span>
            </div>
            <Waveform progress={Math.min(rec, 1)} live={recording} className="mt-3 h-12" />
            <div className="mt-3 flex items-center gap-2 text-[12px] text-white/45">
              <span className="grid size-8 place-items-center rounded-full bg-white/[0.06] text-white">
                {recording ? <Square aria-hidden className="size-3 fill-current" /> : <Play aria-hidden className="ml-0.5 size-3.5 fill-current" />}
              </span>
              {recording ? "Tap to stop" : "Play it back"}
            </div>
          </div>
        </div>

        {/* Where */}
        <div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <Label>Where it plays</Label>
          <ul className="mt-3 space-y-1.5 text-[13.5px]">
            {[
              { label: "Westlands", depth: 0, icon: Building2, on: true },
              { label: "Ground Floor", depth: 1, icon: DoorOpen, on: true },
              { label: "Bar", depth: 2, icon: DoorOpen, on: true },
              { label: "Terrace", depth: 1, icon: DoorOpen, on: false },
              { label: "Nyali", depth: 0, icon: Building2, on: false },
              { label: "Whole venue", depth: 0, icon: AudioLines, on: true, zone: true },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.label} className="flex items-center gap-2.5" style={{ paddingLeft: t.depth * 18 }}>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-[4px] ring-1",
                      t.on ? "bg-white text-ink ring-white" : "ring-white/25",
                    )}
                  >
                    {t.on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <Icon aria-hidden className="size-4 text-white/40" />
                  <span className={t.on ? "text-white" : "text-white/55"}>{t.label}</span>
                  {t.zone ? <span className="font-tech text-[10px] tracking-[0.08em] text-white/30 uppercase">Audio zone</span> : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12.5px] text-white/45">Covers 5 rooms at Westlands</p>
        </div>

        {/* How */}
        <div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <Label>While it plays</Label>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {(["pause", "lower"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 ring-1 transition-colors",
                  mode === m ? "bg-white/[0.08] ring-brand/50" : "ring-white/[0.08] text-white/55 hover:text-white",
                )}
              >
                {m === "pause" ? <Pause aria-hidden className="size-4" /> : <Volume1 aria-hidden className="size-4" />}
                {m === "pause" ? "Pause music" : "Lower music"}
              </button>
            ))}
          </div>
          <label className={cn("mt-3 flex items-center gap-3 transition-opacity", mode === "pause" && "pointer-events-none opacity-35")}>
            <span className="text-[12.5px] text-white/55">Lower to</span>
            <input
              type="range"
              min={5}
              max={60}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
              aria-label="Music level during the announcement"
            />
            <span className="w-9 text-right font-tech text-[12.5px]">{level}%</span>
          </label>

          <Label className="mt-6">When</Label>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {(["now", "schedule"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWhen(w)}
                aria-pressed={when === w}
                className={cn(
                  "rounded-lg px-3 py-2.5 ring-1 transition-colors",
                  when === w ? "bg-white/[0.08] ring-brand/50" : "ring-white/[0.08] text-white/55 hover:text-white",
                )}
              >
                {w === "now" ? "Send now" : "Schedule"}
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-white/70">
            <CalendarClock aria-hidden className="size-4 text-white/40" />
            {when === "now" ? "Plays as soon as you send it" : "Weekdays at 22:30"}
          </p>
          <span className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-strong text-[14px] font-medium">
            <Send aria-hidden className="size-4" /> {when === "now" ? "Send announcement" : "Schedule announcement"}
          </span>
        </div>
      </AppWindow>
    </div>
  );
}

/* --------------------------------- Recorder -------------------------------- */

export function Recorder() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 120, amount: 0.4 });
  // Opens on a finished recording, then loops: record → review.
  const t = (tick + 70) % 110;
  const recording = t < 70;
  const progress = recording ? t / 70 : 1;
  const playhead = recording ? 0 : Math.min(1, (t - 75) / 30);

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium">“Happy hour starts in ten minutes”</p>
        <span className="font-tech text-[13px] text-white/55">0:{String(Math.round(progress * 6)).padStart(2, "0")}</span>
      </div>
      <div className="relative mt-5">
        <Waveform progress={recording ? progress : Math.max(playhead, 0)} live={recording} className="h-20" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors",
            recording ? "bg-brand text-white" : "bg-white text-ink",
          )}
        >
          {recording ? <Square aria-hidden className="size-4 fill-current" /> : <Mic aria-hidden className="size-5" />}
        </span>
        <span className="text-[13px] text-white/60">{recording ? "Recording from your browser…" : "Recorded — play it back before you send"}</span>
        <span className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.05] px-3 text-[12.5px] text-white/70 ring-1 ring-white/[0.08]">
          <CloudUpload aria-hidden className="size-4" /> Upload a file instead
        </span>
      </div>
      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12px] text-white/40">MP3, WAV, M4A, OGG or WebM · up to 15 MB</p>
    </div>
  );
}

/* --------------------------------- Targets --------------------------------- */

const TREE = [
  {
    name: "Westlands",
    zones: [
      { name: "Ground Floor", rooms: ["Dining room", "Bar"] },
      { name: "Terrace", rooms: ["Deck"] },
    ],
  },
  {
    name: "Nyali",
    zones: [{ name: "Beach level", rooms: ["Dining room", "Beach deck"] }],
  },
];

const SELECTIONS = [
  { label: "Just the bar", picks: ["Westlands/Ground Floor/Bar"] },
  { label: "A whole floor", picks: ["Westlands/Ground Floor/Dining room", "Westlands/Ground Floor/Bar"] },
  {
    label: "Every branch",
    picks: ["Westlands/Ground Floor/Dining room", "Westlands/Ground Floor/Bar", "Westlands/Terrace/Deck", "Nyali/Beach level/Dining room", "Nyali/Beach level/Beach deck"],
  },
];

export function TargetPicker() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: SELECTIONS.length, interval: 3000, amount: 0.4 });
  const picks = new Set(SELECTIONS[index].picks);

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example targets">
        {SELECTIONS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => select(i)}
            aria-pressed={i === index}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
              i === index ? "bg-white/[0.09] text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TREE.map((loc) => (
          <div key={loc.name} className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
            <p className="flex items-center gap-2 text-[14px]">
              <Building2 aria-hidden className="size-4 text-white/45" /> {loc.name}
            </p>
            {loc.zones.map((zone) => (
              <div key={zone.name} className="mt-3 pl-3">
                <p className="flex items-center gap-2 text-[12.5px] text-white/55">
                  <DoorOpen aria-hidden className="size-3.5" /> {zone.name}
                </p>
                <ul className="mt-1.5 space-y-1 border-l border-white/[0.08] pl-3">
                  {zone.rooms.map((room) => {
                    const on = picks.has(`${loc.name}/${zone.name}/${room}`);
                    return (
                      <li
                        key={room}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors duration-300",
                          on ? "bg-brand/15 text-white" : "text-white/50",
                        )}
                      >
                        {room}
                        {on ? <Megaphone aria-hidden className="size-3.5 text-brand" /> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-white/45">
        Covers <span className="font-tech text-white">{picks.size}</span> {picks.size === 1 ? "room" : "rooms"}
      </p>
    </div>
  );
}

/* ---------------------------------- Ducking -------------------------------- */

export function DuckingGraph() {
  const [mode, setMode] = useState<"lower" | "pause">("lower");
  const [level, setLevel] = useState(25);
  const dip = mode === "pause" ? 0 : level;

  // Music volume over time: steady at 70, dips during the announcement (x 35–65), then returns.
  const y = (v: number) => 100 - v;
  const path = `M0 ${y(70)} H30 C33 ${y(70)} 33 ${y(dip)} 36 ${y(dip)} H64 C67 ${y(dip)} 67 ${y(70)} 70 ${y(70)} H100`;

  return (
    <div className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["lower", "pause"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ring-1 transition-colors",
              mode === m ? "bg-white/[0.08] ring-brand/50" : "text-white/55 ring-white/[0.08] hover:text-white",
            )}
          >
            {m === "pause" ? <Pause aria-hidden className="size-4" /> : <Volume1 aria-hidden className="size-4" />}
            {m === "pause" ? "Pause the music" : "Lower the music"}
          </button>
        ))}
        <label className={cn("ml-auto flex items-center gap-3 transition-opacity", mode === "pause" && "pointer-events-none opacity-35")}>
          <span className="text-[12.5px] text-white/55">to</span>
          <input
            type="range"
            min={5}
            max={60}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
            aria-label="Music level during the announcement"
          />
          <span className="w-9 text-right font-tech text-[12.5px]">{level}%</span>
        </label>
      </div>

      <div className="relative mt-6">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full" aria-label={`Music volume ${mode === "pause" ? "pauses" : `lowers to ${level}%`} during the announcement, then returns`} role="img">
          <rect x="36" y="0" width="28" height="100" fill="rgb(229 52 46 / 0.08)" />
          {[25, 50, 75].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="rgb(255 255 255 / 0.05)" vectorEffect="non-scaling-stroke" />
          ))}
          <motion.path d={path} fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" initial={false} animate={{ d: path }} transition={{ duration: 0.5, ease: EASE }} />
        </svg>
        <span className="absolute top-2 left-[36%] flex items-center gap-1.5 rounded-md bg-brand/15 px-2 py-1 text-[11.5px] text-white">
          <Megaphone aria-hidden className="size-3.5 text-brand" /> Announcement
        </span>
        <div className="mt-2 flex justify-between font-tech text-[10.5px] text-white/35">
          <span>Music</span>
          <span>{mode === "pause" ? "Paused" : `${level}%`}</span>
          <span>Music returns</span>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Schedule -------------------------------- */

const LIST = [
  { title: "Happy hour in ten minutes", category: "Promotion", when: "Every day · 16:50", status: "Scheduled" },
  { title: "Last orders", category: "Operational", when: "Weekdays · 22:30", status: "Scheduled" },
  { title: "Live band tonight", category: "Event", when: "Fridays · 19:00", status: "Scheduled" },
  { title: "Table 12, your order is ready", category: "Customer service", when: "Today · 13:04", status: "Sent" },
  { title: "Weekend brunch is on", category: "Promotion", when: "Weekends · 09:00", status: "Scheduled" },
];

export function AnnouncementList() {
  return (
    <div>
      <AppWindow path={["Kilele Kitchen", "Announcements"]} bodyClassName="p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Sent today", "6"],
            ["Scheduled", "4"],
            ["This month", "128"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
              <p className="text-[12px] text-white/45">{k}</p>
              <p className="mt-1.5 font-tech text-[22px] leading-none">{v}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-white/[0.05]">
          {LIST.map((a) => (
            <li key={a.title} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/60">
                <Megaphone aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-[13.5px]">
                <span className="block truncate">{a.title}</span>
                <span className="block truncate text-[12px] text-white/40">
                  {a.category} · {a.when}
                </span>
              </span>
              <span
                className={cn(
                  "hidden rounded-md px-2 py-1 text-[11.5px] sm:inline",
                  a.status === "Sent" ? "bg-white/[0.06] text-white/60" : "bg-brand/12 text-white/80",
                )}
              >
                {a.status}
              </span>
              <Copy aria-hidden className="hidden size-4 text-white/30 sm:block" />
            </li>
          ))}
        </ul>
      </AppWindow>
    </div>
  );
}

/* --------------------------------- Takeover -------------------------------- */

export function Takeover() {
  const { ref, index } = useCycle<HTMLDivElement>({ count: 3, interval: 3200, amount: 0.35 });
  // Opens on the announcement itself, then emergency, then the ad it was covering.
  const phase = (["announcement", "emergency", "ad"] as const)[index];

  return (
    <div ref={ref} className="relative overflow-hidden rounded-[24px] bg-[#0e0d0c] px-[6%] pt-[6%] pb-[10%] ring-1 ring-white/[0.06]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_50%_70%_at_50%_0%,rgb(255_232_205/0.10),transparent_70%)]" />
      <div className="relative mx-auto max-w-[900px]">
        <ScreenFrame>
          <ScreenContent id="new-season" sponsored />
          <AnimatePresence>
            {phase !== "ad" ? (
              <motion.div
                key={phase}
                className={cn(
                  "absolute inset-0 z-10 flex flex-col items-center justify-center text-center",
                  phase === "emergency" ? "bg-[#b91c1c]" : "bg-black/80 backdrop-blur-md",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span
                  className={cn(
                    "grid size-[9cqw] place-items-center rounded-full",
                    phase === "emergency" ? "bg-white text-[#b91c1c]" : "bg-white/10 text-white",
                  )}
                >
                  {phase === "emergency" ? <Siren aria-hidden className="size-[4.5cqw]" /> : <Megaphone aria-hidden className="size-[4.2cqw]" />}
                </span>
                <p className="mt-[3cqw] font-tech text-[1.8cqw] tracking-[0.18em] uppercase opacity-80">
                  {phase === "emergency" ? "Emergency announcement" : "Announcement"}
                </p>
                <p className="mt-[1.4cqw] max-w-[70%] font-display text-[5.2cqw] leading-[1.02] font-semibold tracking-[-0.03em]">
                  {phase === "emergency" ? "Please follow staff to the nearest exit" : "Last orders at the bar"}
                </p>
                <Waveform progress={0.6} className="mt-[3cqw] h-[5cqw] w-[40%]" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </ScreenFrame>
        <p className="mt-3 flex items-center justify-center gap-2 text-center font-tech text-[11px] tracking-[0.1em] text-white/40 uppercase">
          <StatusDot state={phase === "ad" ? "idle" : "live"} pulse={phase !== "ad"} />
          {phase === "ad" ? "Ad playing" : phase === "emergency" ? "Emergency takes over the screen" : "Announcement covers the ad"}
        </p>
      </div>
    </div>
  );
}
