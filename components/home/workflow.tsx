"use client";

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

export function Workflow({ standalone = false }: { standalone?: boolean } = {}) {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: STAGES.length, interval: 3400, amount: 0.4 });

  return (
    <Section id="workflow" tone="snow">
      <Container>
        {standalone ? null : (
        <SectionIntro
          index="04"
          kicker="How it works"
          title={
            <>
              Create. Schedule. Publish. <span className="text-white/40">Monitor.</span>
            </>
          }
          body="One flow takes a piece of content from your library to every screen that should show it — and tells you it’s playing."
        />
        )}

        <div ref={ref} className={cn("mt-14 sm:mt-20", standalone && "mt-0 sm:mt-0")}>
          <div className="overflow-hidden rounded-[24px] bg-ink-2 shadow-[0_60px_120px_-50px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.08]">
            {/* Stage rail */}
            <div role="tablist" aria-label="Workflow stages" className="relative grid grid-cols-4 border-b border-white/[0.07]">
              {STAGES.map((stage, i) => (
                <button
                  key={stage.key}
                  role="tab"
                  type="button"
                  aria-selected={index === i}
                  onClick={() => select(i)}
                  className={cn(
                    "group px-3 py-4 text-left transition-colors sm:px-6 sm:py-6",
                    i > 0 && "border-l border-white/[0.07]",
                  )}
                >
                  <span className={cn("font-tech text-[11px] tracking-[0.08em]", index === i ? "text-brand" : "text-white/35")}>
                    0{i + 1}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[15px] font-semibold tracking-[-0.015em] transition-colors sm:text-[18px]",
                      index === i ? "text-white" : "text-white/40 group-hover:text-white/70",
                    )}
                  >
                    {stage.title}
                  </span>
                  <span className="mt-1 hidden text-[14px] text-zinc-400 md:block">{stage.body}</span>
                </button>
              ))}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/[0.04]" />
              <motion.span
                aria-hidden
                className="absolute bottom-[-1px] left-0 h-[2px] bg-brand"
                initial={false}
                animate={{ width: `${((index + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            </div>

            {/* Travelling content card lane (desktop) */}
            <div className="relative hidden h-[84px] border-b border-white/[0.07] bg-white/[0.02] lg:block">
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
                    i > 0 && "border-l border-white/[0.07]",
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
    <div className="flex items-center gap-3 rounded-xl bg-ink-3 p-2 pr-3 shadow-[0_14px_34px_-14px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.1]">
      <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-md">
        <Image src={ITEM.thumb} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium">{ITEM.title}</span>
        <span className="flex items-center gap-1.5 truncate text-[12px] text-white/50">
          <Film aria-hidden className="size-3" /> {ITEM.duration}
          <span className="text-white/25">·</span>
          <span className={cn("truncate", stage === 3 && "text-white")}>{status}</span>
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
  return <p className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">{children}</p>;
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
            <div key={id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-white/[0.06]">
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
      <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.05] px-3 py-2.5 text-[12.5px]">
        <span className="truncate">Weekend brunch.mp4</span>
        <span className="flex items-center gap-1 text-white/60">
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
              i >= 5 && active ? "bg-white text-ink" : i >= 5 ? "bg-white/15 text-white" : "bg-white/[0.05] text-white/40",
            )}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="mt-2.5 font-tech text-[13px]">
        09:00 <span className="text-white/35">→</span> 13:00
      </p>
      <div className="mt-5">
        <Label>Where</Label>
        <ul className="mt-2.5 space-y-1.5 text-[13px]">
          {TARGETS.map((t, i) => (
            <li key={t.name} className={cn("flex items-center gap-2", t.depth && "pl-5 text-white/60")}>
              <motion.span
                className="grid size-4 place-items-center rounded-[4px] ring-1"
                initial={false}
                animate={{
                  backgroundColor: active ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0)",
                  color: active ? "rgba(10, 10, 10, 1)" : "rgba(255, 255, 255, 0.6)",
                }}
                style={{ boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.25)" }}
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
                className="flex shrink-0 items-center gap-1 text-[12px] text-white/60"
                initial={false}
                animate={{ opacity: active ? 1 : 0 }}
                transition={{ delay: active ? 0.9 + i * 0.35 : 0, duration: 0.3 }}
              >
                <Check aria-hidden className="size-3.5 text-live" /> Live
              </motion.span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full origin-left rounded-full bg-white/80"
                initial={false}
                animate={{ scaleX: active ? 1 : 0 }}
                transition={{ duration: active ? 0.9 : 0.3, delay: active ? i * 0.35 : 0, ease: EASE }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[12.5px] leading-relaxed text-white/45">
        Screens pick up changes in real time — nobody touches a remote.
      </p>
    </div>
  );
}

const LIVE_SCREENS = [
  { name: "Main Screen", location: "Westlands" },
  { name: "Bar TV", location: "Westlands" },
  { name: "Entrance screen", location: "Nyali" },
];

function MonitorStage({ active }: { active: boolean }) {
  return (
    <div>
      <Label>Playing now</Label>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-tech text-[34px] leading-none tracking-[-0.03em]">3</span>
        <span className="text-[13px] text-white/50">of 3 screens</span>
      </p>
      <div className="mt-5">
        <Label>Screen status</Label>
        <ul className="mt-3 space-y-2">
          {LIVE_SCREENS.map((screen, i) => (
            <motion.li
              key={screen.name}
              className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5"
              initial={false}
              animate={{ opacity: active ? 1 : 0.6 }}
              transition={{ duration: 0.4, delay: active ? i * 0.12 : 0 }}
            >
              <StatusDot pulse={active} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{screen.name}</span>
                <span className="block truncate text-[11.5px] text-white/45">
                  {screen.location} · showing {ITEM.title}
                </span>
              </span>
              <span className="font-tech text-[10.5px] tracking-[0.08em] text-white/50 uppercase">Online</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
