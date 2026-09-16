"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  Clock,
  DoorOpen,
  ImageIcon,
  MapPin,
  MonitorPlay,
  Pause,
  Plus,
  QrCode,
  SkipForward,
  Speaker,
  Tv,
  Users,
  Volume2,
} from "lucide-react";

import { Equalizer, StatusDot } from "@/components/home/kit/bits";
import { AppWindow, ScreenFrame } from "@/components/home/kit/frames";
import { ScreenSwap } from "@/components/home/kit/signage";
import { useCycle, useTick } from "@/components/home/kit/use-cycle";
import { PLAYLISTS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase", className)}>{children}</p>;
}

/* --------------------------- Add Location wizard --------------------------- */

const WIZARD_STEPS = ["Details", "Rooms & zones", "Screens", "Audio zones", "Review"];

export function LocationWizard() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: WIZARD_STEPS.length, interval: 3200, amount: 0.4 });

  return (
    <div ref={ref}>
      <AppWindow path={["Locations", "Add location"]} note="Draft saved" bodyClassName="p-4 sm:p-6">
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Add location steps">
          {WIZARD_STEPS.map((step, i) => (
            <li key={step}>
              <button type="button" onClick={() => select(i)} className="group w-full text-left" aria-current={i === index ? "step" : undefined}>
                <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.span
                    className="block h-full origin-left bg-brand"
                    initial={false}
                    animate={{ scaleX: i <= index ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                </span>
                <span
                  className={cn(
                    "mt-2 hidden truncate text-[12px] transition-colors sm:block",
                    i === index ? "text-white" : "text-white/40 group-hover:text-white/70",
                  )}
                >
                  {step}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="relative mt-5 min-h-[300px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {index === 0 ? <DetailsStep /> : index === 1 ? <RoomsStep /> : index === 2 ? <ScreensStep /> : index === 3 ? <AudioStep /> : <ReviewStep />}
            </motion.div>
          </AnimatePresence>
        </div>
      </AppWindow>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] text-white/45">{label}</p>
      <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[13.5px] ring-1 ring-white/[0.08]">{children}</div>
    </div>
  );
}

function DetailsStep() {
  return (
    <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
      <div className="space-y-3">
        <Field label="Location name">Westlands</Field>
        <Field label="Address">
          <MapPin aria-hidden className="size-4 text-brand" />
          <span className="truncate">Woodvale Grove, Westlands, Nairobi</span>
        </Field>
        <Field label="Timezone">
          <Clock aria-hidden className="size-4 text-white/40" />
          Africa/Nairobi (EAT)
        </Field>
      </div>
      <div className="space-y-3">
        <div className="relative h-[132px] overflow-hidden rounded-lg bg-[#131316] ring-1 ring-white/[0.08]">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1.2px)] bg-[length:12px_12px]" />
          <div aria-hidden className="absolute top-[38%] left-0 h-[3px] w-full -rotate-6 bg-white/10" />
          <div aria-hidden className="absolute top-0 left-[58%] h-full w-[3px] rotate-12 bg-white/10" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
            <span className="absolute -inset-3 animate-live-ping rounded-full bg-brand/30" aria-hidden />
            <MapPin className="relative size-7 fill-brand text-ink" aria-hidden />
          </span>
          <span className="absolute bottom-2 left-2 rounded-md bg-ink/80 px-2 py-1 font-tech text-[10px] text-white/60">-1.2676, 36.8108</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-2 ring-1 ring-white/[0.08]">
          <span className="relative block h-10 w-14 overflow-hidden rounded-md">
            <Image src="/home/industry-restaurant-sm.webp" alt="" fill sizes="56px" className="object-cover" />
          </span>
          <span className="min-w-0 text-[12.5px]">
            <span className="block truncate">storefront.jpg</span>
            <span className="flex items-center gap-1 text-white/40">
              <ImageIcon aria-hidden className="size-3" /> Location photo
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const ZONE_TREE = [
  { zone: "Ground Floor", rooms: [["Dining room", "Restaurant", 60], ["Bar", "Bar", 24]] },
  { zone: "Terrace", rooms: [["Deck", "Outdoor", 40]] },
] as const;

function RoomsStep() {
  return (
    <div className="space-y-3">
      {ZONE_TREE.map((z) => (
        <div key={z.zone} className="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.07]">
          <p className="flex items-center gap-2 text-[13.5px] font-medium">
            <DoorOpen aria-hidden className="size-4 text-white/45" /> {z.zone}
            <span className="font-tech text-[10px] tracking-[0.08em] text-white/30 uppercase">Zone</span>
          </p>
          <ul className="mt-2 space-y-1.5 pl-6">
            {z.rooms.map(([name, type, cap]) => (
              <li key={name} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-white/80">{name}</span>
                <span className="flex items-center gap-3 text-[12px] text-white/40">
                  {type}
                  <span className="font-tech text-white/55">cap {cap}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[12.5px] text-white/40">
        <Plus aria-hidden className="size-3.5" /> Add a zone or room
      </p>
    </div>
  );
}

function ScreensStep() {
  return (
    <div className="space-y-2.5">
      {[
        ["Main Screen", "Dining room", "4827"],
        ["Bar TV", "Bar", "6153"],
        ["Deck speakers", "Deck", "3390"],
      ].map(([name, room, code], i) => (
        <div key={name} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.07]">
          <span className="grid size-9 place-items-center rounded-lg bg-white/[0.05] text-white/60">
            {i === 2 ? <Speaker aria-hidden className="size-4" /> : <Tv aria-hidden className="size-4" />}
          </span>
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="block truncate">{name}</span>
            <span className="block text-[12px] text-white/40">{room}</span>
          </span>
          <span className="text-right">
            <span className="block font-tech text-[16px] tracking-[0.2em]">{code}</span>
            <span className="block text-[11px] text-white/40">Pairing code</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function AudioStep() {
  return (
    <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.07]">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-medium">Whole venue</p>
        <Equalizer bars={4} className="h-3.5" barClassName="w-[2px]" />
      </div>
      <p className="mt-1 text-[12.5px] text-white/45">Plays in sync across 3 rooms</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Dining room", "Bar", "Deck"].map((room) => (
          <span key={room} className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[12px]">
            <Check aria-hidden className="size-3 text-brand" /> {room}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <Label>Default playlist</Label>
          <p className="mt-1.5">Lunch Rush</p>
        </div>
        <div>
          <Label>Volume limit</Label>
          <p className="mt-1.5 font-tech">80%</p>
        </div>
      </div>
    </div>
  );
}

function ReviewStep() {
  return (
    <div>
      <ul className="divide-y divide-white/[0.06] rounded-lg bg-white/[0.03] ring-1 ring-white/[0.07]">
        {[
          ["Location", "Westlands · Nairobi"],
          ["Zones & rooms", "2 zones · 3 rooms"],
          ["Screens & devices", "3 waiting to pair"],
          ["Audio zones", "Whole venue"],
        ].map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
            <span className="text-white/45">{k}</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
      <span className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-strong px-4 text-[13.5px] font-medium">Create location</span>
    </div>
  );
}

/* ----------------------------- Zones & rooms ----------------------------- */

const LOCATION_TREE = [
  {
    zone: "Ground Floor",
    rooms: [
      { name: "Dining room", cap: 60, screens: 2, speakers: 2 },
      { name: "Bar", cap: 24, screens: 1, speakers: 1 },
    ],
  },
  { zone: "Terrace", rooms: [{ name: "Deck", cap: 40, screens: 1, speakers: 2 }] },
  { zone: "First Floor", rooms: [{ name: "Private dining", cap: 18, screens: 1, speakers: 1 }] },
];

export function ZonesTree() {
  const rooms = LOCATION_TREE.flatMap((z) => z.rooms.map((r) => ({ ...r, zone: z.zone })));
  const { ref, index } = useCycle<HTMLDivElement>({ count: rooms.length, interval: 2200, amount: 0.4 });
  const active = rooms[index];

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <Building2 aria-hidden className="size-4 text-white/50" /> Westlands
        </p>
        <p className="font-tech text-[11px] text-white/40">3 zones · 4 rooms · cap 142</p>
      </div>
      <div className="mt-5 space-y-4">
        {LOCATION_TREE.map((z) => (
          <div key={z.zone}>
            <p className="flex items-center gap-2 text-[13px] text-white/60">
              <DoorOpen aria-hidden className="size-3.5" /> {z.zone}
            </p>
            <ul className="mt-2 grid gap-2 border-l border-white/[0.08] pl-4 sm:grid-cols-2">
              {z.rooms.map((r) => {
                const on = active.name === r.name;
                return (
                  <li
                    key={r.name}
                    className={cn(
                      "rounded-xl p-3 ring-1 transition-[background-color,box-shadow] duration-500",
                      on ? "bg-white/[0.07] ring-brand/50" : "bg-white/[0.025] ring-white/[0.06]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[14px]">{r.name}</p>
                      <p className="font-tech text-[11px] text-white/45">cap {r.cap}</p>
                    </div>
                    <p className="mt-2 flex items-center gap-3 text-[12px] text-white/45">
                      <span className="flex items-center gap-1">
                        <MonitorPlay aria-hidden className="size-3.5" /> {r.screens}
                      </span>
                      <span className="flex items-center gap-1">
                        <Speaker aria-hidden className="size-3.5" /> {r.speakers}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <StatusDot /> Online
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Screens & devices --------------------------- */

const DEVICES = [
  { name: "Main Screen", room: "Dining room", kind: "tv" as const },
  { name: "Bar TV", room: "Bar", kind: "tv" as const },
  { name: "Deck speakers", room: "Deck", kind: "audio" as const },
  { name: "Private dining TV", room: "Private dining", kind: "tv" as const },
];

/** Pairing loop: the TV shows a code, it's entered, and the device flips to Online. */
export function DevicesPanel() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 900, amount: 0.35 });
  const phase = tick % 10; // 0-3 typing, 4-5 connecting, 6-9 online
  const typed = Math.min(4, phase);
  const paired = phase >= 6;

  return (
    <div ref={ref} className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
        <Label>On the TV</Label>
        <ScreenFrame className="mt-3">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0b0c]">
            <AnimatePresence mode="wait" initial={false}>
              {paired ? (
                <motion.div key="paired" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ScreenSwap id="lunch-menu" />
                </motion.div>
              ) : (
                <motion.div key="code" className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[2.6cqw] text-white/60">Pair this screen</p>
                  <div className="mt-[2.5cqw] flex gap-[1.6cqw]">
                    {["4", "8", "2", "7"].map((d, i) => (
                      <span
                        key={i}
                        className={cn(
                          "grid h-[12cqw] w-[9.5cqw] place-items-center rounded-[1.2cqw] font-tech text-[7cqw] ring-1 transition-colors",
                          i < typed ? "bg-white/[0.1] ring-brand/60" : "bg-white/[0.04] ring-white/15",
                        )}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <p className="mt-[3cqw] text-[1.9cqw] text-white/40">{phase >= 4 ? "Connecting…" : "Enter this code in Screens & Devices"}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScreenFrame>
      </div>

      <div className="rounded-2xl bg-ink-2 ring-1 ring-white/[0.09]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <p className="text-[14px] font-medium">Screens &amp; devices</p>
          <p className="flex items-center gap-1.5 text-[12px] text-white/45">
            <StatusDot pulse /> Live status
          </p>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {DEVICES.map((d, i) => {
            const pending = i === 3 && !paired;
            return (
              <li key={d.name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/60">
                  {d.kind === "tv" ? <Tv aria-hidden className="size-4" /> : <Speaker aria-hidden className="size-4" />}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px]">
                  <span className="block truncate">{d.name}</span>
                  <span className="block truncate text-[12px] text-white/40">{d.room}</span>
                </span>
                {d.kind === "tv" ? (
                  <span className="hidden items-center gap-1 text-[11.5px] text-white/35 sm:flex">
                    <QrCode aria-hidden className="size-3.5" /> Guest QR
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex w-[92px] items-center justify-end gap-1.5 text-[12.5px]",
                    pending ? "text-white/50" : "text-white/80",
                  )}
                >
                  <StatusDot state={pending ? "idle" : "online"} pulse={!pending} />
                  {pending ? (typed > 0 ? "Pairing…" : "Pending") : "Online"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------- Team --------------------------------- */

const TEAM = [
  { name: "Wanjiku Mwangi", role: "Owner", scope: "All locations", initials: "WM" },
  { name: "Achieng Otieno", role: "Admin", scope: "All locations", initials: "AO" },
  { name: "Brian Kiprono", role: "Manager", scope: "Westlands · Milimani", initials: "BK" },
  { name: "Fatma Ali", role: "Manager", scope: "Nyali", initials: "FA" },
];

export function TeamPanel() {
  return (
    <div className="rounded-2xl bg-ink-2 ring-1 ring-white/[0.09]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-[14px] font-medium">
          <Users aria-hidden className="size-4 text-white/50" /> Team
        </p>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-[12.5px] ring-1 ring-white/[0.08]">
          <Plus aria-hidden className="size-3.5" /> Add teammate
        </span>
      </div>
      <ul className="divide-y divide-white/[0.05]">
        {TEAM.map((m) => (
          <li key={m.name} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[12px] font-medium">{m.initials}</span>
            <span className="min-w-0 flex-1 text-[13.5px]">
              <span className="block truncate">{m.name}</span>
              <span className="block truncate text-[12px] text-white/40">{m.scope}</span>
            </span>
            <span
              className={cn(
                "rounded-md px-2 py-1 font-tech text-[10.5px] tracking-[0.06em] uppercase",
                m.role === "Owner" ? "bg-brand/15 text-brand" : m.role === "Admin" ? "bg-white/[0.08] text-white/80" : "bg-white/[0.04] text-white/55",
              )}
            >
              {m.role}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-white/[0.07] px-4 py-3 text-[12.5px] text-white/45 sm:px-5">
        Managers see only the locations they’re assigned. They can’t manage the team or approve content.
      </p>
    </div>
  );
}

/* ------------------------------ Remote player ------------------------------ */

export function RemotePlayer() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 3800, amount: 0.35 });

  // A quiet demo loop drives the controls until someone touches them; from
  // then on the visitor's own choices (seeded from the demo state) take over.
  const demo = {
    playing: true,
    track: (1 + Math.floor((tick + 2) / 3)) % PLAYLISTS.length,
    volume: Math.floor((tick + 1) / 3) % 2 ? 48 : 64,
    pushedAll: Math.floor(tick / 3) % 2 === 1,
  };
  const [own, setOwn] = useState<typeof demo | null>(null);
  const state = own ?? demo;
  const { playing, track, volume, pushedAll } = state;
  const act = (patch: (s: typeof demo) => Partial<typeof demo>) => setOwn({ ...state, ...patch(state) });

  const playlist = PLAYLISTS[track];

  return (
    <div ref={ref} className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="relative overflow-hidden rounded-[24px] bg-[#0e0d0c] px-[7%] pt-[7%] pb-[14%] ring-1 ring-white/[0.06]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_50%_70%_at_50%_0%,rgb(255_232_205/0.10),transparent_70%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[12%] border-t border-white/[0.08] bg-linear-to-b from-[#1a1918] to-[#0c0c0b]" />
        <ScreenFrame className="relative">
          <div className="absolute inset-0 overflow-hidden bg-black">
            <AnimatePresence initial={false}>
              <motion.div key={playlist.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
                <Image src={playlist.cover} alt="" fill sizes="50vw" className={cn("object-cover transition-[filter] duration-500", !playing && "brightness-50")} />
              </motion.div>
            </AnimatePresence>
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-[5cqw] left-[5cqw]">
              <p className="font-tech text-[1.6cqw] tracking-[0.16em] text-white/60 uppercase">{playing ? "Now playing" : "Paused"}</p>
              <p className="mt-[0.8cqw] font-display text-[4.6cqw] leading-none font-semibold tracking-[-0.03em]">{playlist.track}</p>
              <p className="mt-[0.8cqw] text-[2.2cqw] text-white/65">{playlist.artist}</p>
            </div>
          </div>
        </ScreenFrame>
      </div>

      <div className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium">Westlands · Remote</p>
          <p className="flex items-center gap-1.5 text-[12px] text-white/45">
            <StatusDot pulse /> Live
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg">
            <Image src={playlist.cover} alt="" fill sizes="56px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium">{playlist.track}</span>
            <span className="block truncate text-[12.5px] text-white/45">{playlist.name}</span>
          </span>
          <Equalizer bars={4} playing={playing} className="h-3.5" barClassName="w-[2px]" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => act((s) => ({ playing: !s.playing }))}
            aria-label={playing ? "Pause" : "Play"}
            className="grid size-10 place-items-center rounded-full bg-white text-ink transition-transform active:scale-95"
          >
            {playing ? <Pause aria-hidden className="size-4 fill-current" /> : <PlayIcon />}
          </button>
          <button
            type="button"
            onClick={() => act((s) => ({ track: (s.track + 1) % PLAYLISTS.length }))}
            aria-label="Skip"
            className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.1]"
          >
            <SkipForward aria-hidden className="size-4" />
          </button>
          <label className="ml-2 flex flex-1 items-center gap-2.5">
            <Volume2 aria-hidden className="size-4 shrink-0 text-white/45" />
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => act(() => ({ volume: Number(e.target.value) }))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
            />
            <span className="w-8 text-right font-tech text-[12px] text-white/55">{volume}</span>
          </label>
        </div>
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <Label>Up next · pushed by you</Label>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate">{PLAYLISTS[(track + 1) % PLAYLISTS.length].track}</span>
            <button
              type="button"
              onClick={() => act((s) => ({ pushedAll: !s.pushedAll }))}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] ring-1 transition-colors",
                pushedAll ? "bg-brand/15 text-brand ring-brand/30" : "bg-white/[0.04] text-white/70 ring-white/[0.08]",
              )}
            >
              {pushedAll ? "Sent to all 4 locations" : "Send to all locations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="ml-0.5 size-4 fill-current">
      <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
    </svg>
  );
}
