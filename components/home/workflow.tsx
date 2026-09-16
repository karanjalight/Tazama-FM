"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Film } from "lucide-react";

import { CONTENT } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { StatusDot } from "./kit/bits";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { useCycle } from "./kit/use-cycle";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  { key: "create", title: "Create", body: "Choose your content." },
  { key: "schedule", title: "Schedule", body: "Decide when and where it plays." },
  { key: "publish", title: "Publish", body: "Send it to your screens." },
  { key: "monitor", title: "Monitor", body: "See what’s happening everywhere." },
] as const;

const ITEM = CONTENT["weekend-brunch"];

export function Workflow() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: STAGES.length, interval: 3400, amount: 0.4 });

  return (
    <Section id="workflow" tone="snow">
      <Container>
        <SectionIntro
          index="04"
          kicker="How it works"
          tone="light"
          title={
            <>
              Create. Schedule. Publish. <span className="text-zinc-400">Monitor.</span>
            </>
          }
          body="One flow takes a piece of content from your library to every screen that should show it — and tells you it’s playing."
        />

        <div ref={ref} className="mt-14 sm:mt-20">
          <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_40px_100px_-50px_rgb(10_10_10/0.35)] ring-1 ring-black/[0.07]">
            {/* Stage rail */}
            <div role="tablist" aria-label="Workflow stages" className="relative grid grid-cols-4 border-b border-black/[0.06]">
              {STAGES.map((stage, i) => (
                <button
                  key={stage.key}
                  role="tab"
                  type="button"
                  aria-selected={index === i}
                  onClick={() => select(i)}
                  className={cn(
                    "group px-3 py-4 text-left transition-colors sm:px-6 sm:py-6",
                    i > 0 && "border-l border-black/[0.06]",
                  )}
                >
                  <span className={cn("font-tech text-[11px] tracking-[0.08em]", index === i ? "text-brand" : "text-zinc-400")}>
                    0{i + 1}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[15px] font-semibold tracking-[-0.015em] transition-colors sm:text-[18px]",
                      index === i ? "text-ink" : "text-zinc-400 group-hover:text-zinc-600",
                    )}
                  >
                    {stage.title}
                  </span>
                  <span className="mt-1 hidden text-[14px] text-zinc-500 md:block">{stage.body}</span>
                </button>
              ))}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-black/[0.04]" />
              <motion.span
                aria-hidden
                className="absolute bottom-[-1px] left-0 h-[2px] bg-brand"
                initial={false}
                animate={{ width: `${((index + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            </div>

            {/* Travelling content card lane (desktop) */}
            <div className="relative hidden h-[84px] border-b border-black/[0.06] bg-snow/60 lg:block">
              <motion.div
                className="absolute top-1/2 w-1/4 -translate-y-1/2 px-6"
                initial={false}
                animate={{ left: `${(index / STAGES.length) * 100}%` }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <ContentChip stage={index} />
              </motion.div>
            </div>

            {/* Stage bodies — all four side by side on desktop */}
            <div className="hidden grid-cols-4 lg:grid">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.key}
                  className={cn(
                    "h-[340px] p-6 transition-opacity duration-500",
                    i > 0 && "border-l border-black/[0.06]",
                    index === i ? "opacity-100" : "opacity-45",
                  )}
                >
                  <StageBody stage={i} active={index === i} />
                </div>
              ))}
            </div>

            {/* Compact: one stage at a time */}
            <div className="p-4 sm:p-6 lg:hidden" role="tabpanel">
              <ContentChip stage={index} />
              <div className="mt-5 min-h-[300px]">
                <StageBody key={index} stage={index} active />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function ContentChip({ stage }: { stage: number }) {
  const status = ["Approved", "Sat & Sun · 09:00", "Sending to 3 screens", "Playing on 3 screens"][stage];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2 pr-3 shadow-[0_12px_30px_-14px_rgb(10_10_10/0.35)] ring-1 ring-black/[0.08]">
      <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-md">
        <Image src={ITEM.thumb} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium">{ITEM.title}</span>
        <span className="flex items-center gap-1.5 truncate text-[12px] text-zinc-500">
          <Film aria-hidden className="size-3" /> {ITEM.duration}
          <span className="text-zinc-300">·</span>
          <span className={cn("truncate", stage === 3 && "text-ink")}>{status}</span>
        </span>
      </span>
      {stage === 3 ? <StatusDot pulse /> : null}
    </div>
  );
}

function StageBody({ stage, active }: { stage: number; active: boolean }) {
  switch (stage) {
    case 0:
      return <CreateStage active={active} />;
    case 1:
      return <ScheduleStage active={active} />;
    case 2:
      return <PublishStage active={active} />;
    default:
      return <MonitorStage active={active} />;
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-tech text-[10.5px] tracking-[0.1em] text-zinc-400 uppercase">{children}</p>;
}

const LIBRARY = ["weekend-brunch", "breakfast-menu", "happy-hour", "chefs-special", "lunch-menu", "brand-film"] as const;

function CreateStage({ active }: { active: boolean }) {
  return (
    <div>
      <Label>Content library</Label>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {LIBRARY.map((id, i) => {
          const selected = i === 0;
          return (
            <div key={id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
              <Image src={CONTENT[id].thumb} alt="" fill sizes="90px" className="object-cover" />
              {selected ? (
                <motion.span
                  className="absolute inset-0 rounded-md ring-2 ring-brand ring-inset"
                  initial={false}
                  animate={{ opacity: active ? 1 : 0.6 }}
                >
                  <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-brand text-white">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                </motion.span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-snow px-3 py-2.5 text-[12.5px]">
        <span className="truncate">Weekend brunch.mp4</span>
        <span className="flex items-center gap-1 text-zinc-600">
          <Check aria-hidden className="size-3.5 text-live" /> Approved
        </span>
      </div>
    </div>
  );
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TARGETS = [
  { name: "Westlands", depth: 0 },
  { name: "Main Screen", depth: 1 },
  { name: "Bar TV", depth: 1 },
  { name: "Nyali", depth: 0 },
  { name: "Entrance screen", depth: 1 },
];

function ScheduleStage({ active }: { active: boolean }) {
  return (
    <div>
      <Label>When</Label>
      <div className="mt-3 flex gap-1">
        {DAYS.map((d, i) => (
          <span
            key={i}
            className={cn(
              "grid size-7 place-items-center rounded-md text-[12px] transition-colors duration-500",
              i >= 5 && active ? "bg-ink text-white" : i >= 5 ? "bg-zinc-200 text-ink" : "bg-snow text-zinc-500",
            )}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="mt-2.5 font-tech text-[13px]">
        09:00 <span className="text-zinc-400">→</span> 13:00
      </p>
      <div className="mt-5">
        <Label>Where</Label>
        <ul className="mt-2.5 space-y-1.5 text-[13px]">
          {TARGETS.map((t, i) => (
            <li key={t.name} className={cn("flex items-center gap-2", t.depth && "pl-5 text-zinc-600")}>
              <motion.span
                className="grid size-4 place-items-center rounded-[4px] ring-1"
                initial={false}
                animate={{
                  backgroundColor: active ? "rgb(10 10 10)" : "rgb(255 255 255)",
                  color: active ? "rgb(255 255 255)" : "rgb(10 10 10)",
                }}
                style={{ boxShadow: "inset 0 0 0 1px rgb(10 10 10 / 0.2)" }}
                transition={{ duration: 0.25, delay: active ? i * 0.12 : 0 }}
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
              {t.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const SCREENS = ["Westlands · Main Screen", "Westlands · Bar TV", "Nyali · Entrance screen"];

function PublishStage({ active }: { active: boolean }) {
  return (
    <div>
      <Label>Sending</Label>
      <ul className="mt-3 space-y-4">
        {SCREENS.map((screen, i) => (
          <li key={screen}>
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate">{screen}</span>
              <motion.span
                className="flex shrink-0 items-center gap-1 text-[12px] text-zinc-600"
                initial={false}
                animate={{ opacity: active ? 1 : 0 }}
                transition={{ delay: active ? 0.9 + i * 0.35 : 0, duration: 0.3 }}
              >
                <Check aria-hidden className="size-3.5 text-live" /> Live
              </motion.span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
              <motion.div
                className="h-full origin-left rounded-full bg-ink"
                initial={false}
                animate={{ scaleX: active ? 1 : 0 }}
                transition={{ duration: active ? 0.9 : 0.3, delay: active ? i * 0.35 : 0, ease: EASE }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[12.5px] leading-relaxed text-zinc-500">
        Screens pick up changes in real time — nobody touches a remote.
      </p>
    </div>
  );
}

const HOURS = [22, 38, 61, 84, 70, 52, 44, 30];

function MonitorStage({ active }: { active: boolean }) {
  const [plays, setPlays] = useState(1284);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setPlays((p) => p + 1 + Math.floor(Math.random() * 3)), 700);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div>
      <Label>Playing now</Label>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-tech text-[34px] leading-none tracking-[-0.03em]">3</span>
        <span className="text-[13px] text-zinc-500">of 3 screens</span>
      </p>
      <div className="mt-5">
        <Label>Plays this weekend</Label>
        <p className="mt-2 font-tech text-[20px] tabular-nums">{plays.toLocaleString("en-US")}</p>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {HOURS.map((h, i) => (
            <motion.span
              key={i}
              className={cn("flex-1 origin-bottom rounded-[3px]", i === 3 ? "bg-brand" : "bg-zinc-200")}
              style={{ height: `${h}%` }}
              initial={false}
              animate={{ scaleY: active ? 1 : 0.35 }}
              transition={{ duration: 0.6, delay: active ? i * 0.05 : 0, ease: EASE }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-tech text-[10px] text-zinc-400">
          <span>09:00</span>
          <span>13:00</span>
        </div>
      </div>
    </div>
  );
}
