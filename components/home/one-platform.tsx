"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { Equalizer, StatusDot } from "./kit/bits";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { QrMark } from "./kit/qr";
import { useCycle } from "./kit/use-cycle";
import { MicGlyph } from "./kit/wordmark";

type Kind =
  | "music"
  | "signage"
  | "video"
  | "promotions"
  | "announcements"
  | "advertising"
  | "qr"
  | "analytics";

interface Experience {
  kind: Kind;
  title: string;
  body: string;
  /** What the control center reports while this experience is highlighted. */
  status: string;
}

const EXPERIENCES: Experience[] = [
  { kind: "music", title: "Music", body: "Playlists and AI mixes, in sync across zones.", status: "Lunch Rush playing in 9 zones" },
  { kind: "signage", title: "Digital signage", body: "Menus, notices and brand content on any TV.", status: "Lunch menu on 6 screens" },
  { kind: "video", title: "Video", body: "Brand films and loops, scheduled by the hour.", status: "Brand film looping in 3 bars" },
  { kind: "promotions", title: "Promotions", body: "Offers that go live exactly when they matter.", status: "Happy hour goes live at 17:00" },
  { kind: "announcements", title: "Announcements", body: "Voice messages that lower the music, then hand it back.", status: "“Last orders” scheduled for 22:30" },
  { kind: "advertising", title: "Advertising", body: "Campaigns for your offers — or other brands.", status: "New season campaign on air" },
  { kind: "qr", title: "QR experiences", body: "Guests request songs from their phone. No app.", status: "3 guest requests queued" },
  { kind: "analytics", title: "Screen status & ad reporting", body: "Live screen status, plus plays and estimated reach for every campaign.", status: "18 of 19 screens online" },
];

/* Diagram coordinates: a 1000 × 480 box. Nodes sit at these y's, four a side. */
const NODE_Y = [58, 179, 301, 422];
const HUB_Y = [192, 227, 262, 297];

function connector(side: "left" | "right", row: number) {
  const ny = NODE_Y[row];
  const hy = HUB_Y[row];
  const dir = hy > ny ? -1 : 1; // vertical direction from hub toward node
  const r = 10;
  if (side === "left") {
    // hub edge (380) → elbow at x=340 → node edge (300)
    return `M380 ${hy} H350 Q340 ${hy} 340 ${hy + dir * r} V${ny - dir * r} Q340 ${ny} 330 ${ny} H300`;
  }
  return `M620 ${hy} H650 Q660 ${hy} 660 ${hy + dir * r} V${ny - dir * r} Q660 ${ny} 670 ${ny} H700`;
}

const PATHS = EXPERIENCES.map((_, i) => connector(i < 4 ? "left" : "right", i % 4));

export function OnePlatform() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: EXPERIENCES.length, interval: 2600 });
  const active = EXPERIENCES[index];

  return (
    <Section id="platform" tone="light">
      <Container>
        <SectionIntro
          index="02"
          kicker="The platform"
          align="center"
          title={
            <>
              One platform. <span className="text-white/40 sm:block">Every customer-facing experience.</span>
            </>
          }
          body="Everything that plays, shows or speaks in your venues runs from the same control center — so it all works together."
        />

        <div ref={ref} className="mt-16 sm:mt-24">
          {/* Desktop: hub-and-spoke diagram */}
          <div className="relative hidden aspect-[1000/480] lg:block">
            <svg
              aria-hidden
              viewBox="0 0 1000 480"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full"
            >
              {PATHS.map((d) => (
                <path key={d} d={d} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="0.9" />
              ))}
              <motion.path
                key={index}
                d={PATHS[index]}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="1.6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {EXPERIENCES.map((exp, i) => {
              const left = i < 4;
              const y = NODE_Y[i % 4] / 4.8;
              return (
                <button
                  key={exp.kind}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={index === i}
                  className={cn(
                    "group absolute flex w-[29%] -translate-y-1/2 items-center gap-4 rounded-2xl p-2 text-left transition-colors",
                    left ? "left-0 flex-row-reverse text-right" : "right-0",
                  )}
                  style={{ top: `${y}%` }}
                >
                  <Visual kind={exp.kind} active={index === i} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[17px] font-semibold tracking-[-0.015em] transition-colors",
                        index === i ? "text-white" : "text-white/55 group-hover:text-white",
                      )}
                    >
                      {exp.title}
                    </span>
                    <span className="mt-1 block text-[14px] leading-snug text-zinc-400">{exp.body}</span>
                  </span>
                </button>
              );
            })}

            <div className="absolute top-1/2 left-1/2 w-[25%] -translate-x-1/2 -translate-y-1/2">
              <Hub status={active.status} kind={active.kind} />
            </div>
          </div>

          {/* Compact: hub, then a grid of experiences */}
          <div className="lg:hidden">
            <div className="mx-auto max-w-sm">
              <Hub status={active.status} kind={active.kind} />
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {EXPERIENCES.map((exp, i) => (
                <button
                  key={exp.kind}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={index === i}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-2xl p-3 text-left ring-1 transition-[box-shadow,background-color]",
                    index === i ? "bg-white/[0.06] ring-white/15" : "ring-white/[0.07]",
                  )}
                >
                  <Visual kind={exp.kind} active={index === i} />
                  <span className="text-[14px] leading-tight font-semibold tracking-[-0.01em]">{exp.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Hub({ status, kind }: { status: string; kind: Kind }) {
  return (
    <div className="rounded-[22px] bg-ink p-5 text-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),0_0_80px_-20px_rgb(229_52_46/0.18)] ring-1 ring-white/[0.1]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <MicGlyph className="size-4" />
          Tazama
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-white/50">
          <StatusDot pulse />
          Live
        </span>
      </div>
      <p className="mt-5 text-[12px] text-white/45">Kilele Kitchen · 4 locations</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["19", "Screens"],
          ["9", "Zones"],
          ["4", "Locations"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl bg-white/[0.05] px-2.5 py-2">
            <p className="font-tech text-[17px] leading-none">{value}</p>
            <p className="mt-1.5 text-[11px] text-white/45">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-12 items-center overflow-hidden rounded-xl bg-white/[0.05] px-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={kind}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-w-0 items-center gap-2 text-[13px]"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            <span className="truncate">{status}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A distinct, tiny live visual per experience — not eight copies of one icon. */
function Visual({ kind, active }: { kind: Kind; active: boolean }) {
  const box = cn(
    "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[14px] ring-1 transition-[background-color,box-shadow] duration-300",
    active ? "bg-white text-ink ring-white shadow-[0_12px_32px_-12px_rgb(229_52_46/0.45)]" : "bg-white/[0.04] text-white ring-white/[0.09]",
  );
  switch (kind) {
    case "music":
      return (
        <span aria-hidden className={box}>
          <Equalizer bars={5} playing={active} className="h-5" barClassName={active ? "" : "bg-white/35"} />
        </span>
      );
    case "signage":
      return (
        <span aria-hidden className={box}>
          <span className={cn("grid h-7 w-10 grid-cols-2 gap-[3px] rounded-[4px] p-[3px] ring-1", active ? "ring-black/15" : "ring-white/20")}>
            <span className={cn("rounded-[2px]", active ? "bg-brand" : "bg-white/25")} />
            <span className="flex flex-col justify-center gap-[3px]">
              {[0, 1, 2].map((l) => (
                <span key={l} className={cn("h-[2px] rounded-full", active ? "bg-ink/50" : "bg-white/25")} />
              ))}
            </span>
          </span>
        </span>
      );
    case "video":
      return (
        <span aria-hidden className={box}>
          <span className="relative block h-7 w-10 overflow-hidden rounded-[4px]">
            <Image src="/home/screen-chef.webp" alt="" fill sizes="40px" className={cn("object-cover transition", !active && "grayscale")} />
            <span className="absolute inset-x-[3px] bottom-[3px] h-[2px] overflow-hidden rounded-full bg-white/30">
              <span className={cn("block h-full origin-left bg-white", active ? "animate-[tz-progress_3s_linear_infinite]" : "scale-x-50")} />
            </span>
          </span>
        </span>
      );
    case "promotions":
      return (
        <span aria-hidden className={box}>
          <span className={cn("font-tech text-[15px] font-semibold tracking-[-0.04em]", active && "text-brand")}>−20%</span>
        </span>
      );
    case "announcements":
      return (
        <span aria-hidden className={box}>
          <span className="flex items-center gap-1.5">
            <Megaphone className={cn("size-[18px]", active && "text-brand")} />
            <span className="flex h-4 items-end gap-[2px]">
              {[1, 0.6, 0.85].map((h, b) => (
                <span
                  key={b}
                  className={cn("w-[2px] rounded-full transition-transform duration-500", active ? "bg-ink/40" : "bg-white/35")}
                  style={{ height: "100%", transform: `scaleY(${active ? 0.3 : h})`, transformOrigin: "bottom" }}
                />
              ))}
            </span>
          </span>
        </span>
      );
    case "advertising":
      return (
        <span aria-hidden className={box}>
          <span className="flex flex-col items-center gap-1">
            <span className={cn("rounded-[4px] px-1.5 py-[3px] font-tech text-[10px] leading-none font-semibold", active ? "bg-ink text-white" : "bg-white text-ink")}>AD</span>
            <span className="flex items-center gap-1 font-tech text-[8px] tracking-[0.08em] uppercase">
              <StatusDot state={active ? "live" : "idle"} pulse={active} className="size-1.5" />
              {active ? "On air" : "Ready"}
            </span>
          </span>
        </span>
      );
    case "qr":
      return (
        <span aria-hidden className={box}>
          <QrMark seed={5} className="size-8" />
        </span>
      );
    case "analytics":
      return (
        <span aria-hidden className={box}>
          <svg viewBox="0 0 40 24" className="h-6 w-10">
            <motion.path
              key={active ? "on" : "off"}
              d="M1 20 L8 15 L14 17 L21 9 L28 11 L39 3"
              fill="none"
              stroke={active ? "var(--color-brand)" : "rgb(255 255 255 / 0.4)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: active ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </svg>
        </span>
      );
  }
}
