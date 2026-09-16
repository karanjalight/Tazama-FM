"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CloudUpload,
  Film,
  ImageIcon,
  MonitorPlay,
  Music2,
  Pause,
  Play,
  Search,
  SkipForward,
  Target,
  VolumeX,
} from "lucide-react";

import { Equalizer, StatusDot } from "@/components/home/kit/bits";
import { AppWindow, ScreenFrame } from "@/components/home/kit/frames";
import { ScreenSwap } from "@/components/home/kit/signage";
import { useCycle, useTick } from "@/components/home/kit/use-cycle";
import { CONTENT, PLAYLISTS, type ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase", className)}>{children}</p>;
}

/* ------------------------------ Hero window ------------------------------ */

const LIBRARY: { id: ContentId; type: "Video" | "Image"; meta: string; status: "Approved" | "Pending" }[] = [
  { id: "lunch-menu", type: "Image", meta: "PNG · 1.8 MB", status: "Approved" },
  { id: "happy-hour", type: "Video", meta: "0:10 · 18 MB", status: "Approved" },
  { id: "weekend-brunch", type: "Video", meta: "0:15 · 26 MB", status: "Approved" },
  { id: "brand-film", type: "Video", meta: "0:30 · 64 MB", status: "Approved" },
  { id: "chefs-special", type: "Image", meta: "JPG · 2.4 MB", status: "Pending" },
  { id: "breakfast-menu", type: "Image", meta: "PNG · 1.6 MB", status: "Approved" },
  { id: "dessert-promo", type: "Image", meta: "JPG · 3.1 MB", status: "Approved" },
  { id: "new-season", type: "Video", meta: "0:15 · 31 MB", status: "Pending" },
];

export function LibraryWindow() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: 6, interval: 3200, amount: 0.25 });
  const selected = LIBRARY[index];

  return (
    <div ref={ref}>
      <AppWindow path={["Kilele Kitchen", "Content Library"]} bodyClassName="grid xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {["All", "Videos", "Images"].map((t, i) => (
              <span key={t} className={cn("rounded-lg px-3 py-1.5 text-[13px]", i === 0 ? "bg-white/[0.08]" : "text-white/45")}>
                {t}
              </span>
            ))}
            <span className="ml-auto hidden h-9 w-56 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[12.5px] text-white/35 ring-1 ring-white/[0.07] sm:flex">
              <Search aria-hidden className="size-3.5" /> Search content
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LIBRARY.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(i % 6)}
                className={cn(
                  "group overflow-hidden rounded-xl bg-white/[0.03] text-left ring-1 transition-[box-shadow,background-color]",
                  i === index ? "ring-brand/70" : "ring-white/[0.07] hover:ring-white/20",
                )}
              >
                <span className="relative block aspect-video">
                  <Image src={CONTENT[item.id].thumb} alt="" fill sizes="160px" className="object-cover" />
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] backdrop-blur">
                    {item.type === "Video" ? <Film aria-hidden className="size-3" /> : <ImageIcon aria-hidden className="size-3" />}
                    {item.type}
                  </span>
                </span>
                <span className="block p-2.5">
                  <span className="block truncate text-[12.5px]">{CONTENT[item.id].title}</span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-white/40">
                    <span className="truncate">{item.meta}</span>
                    <span className={cn("shrink-0", item.status === "Pending" ? "text-amber-300/90" : "text-white/55")}>{item.status}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-between text-[12px] text-white/40">
            <span>24 items · 3.2 GB used</span>
            <span className="flex items-center gap-1.5">
              <CloudUpload aria-hidden className="size-3.5" /> Drop files to upload
            </span>
          </p>
        </div>

        <aside className="border-t border-white/[0.06] p-4 sm:p-5 xl:border-t-0 xl:border-l">
          <Label>Preview</Label>
          <ScreenFrame className="mt-3">
            <ScreenSwap id={selected.id} />
          </ScreenFrame>
          <dl className="mt-4 divide-y divide-white/[0.06] text-[13px]">
            {[
              ["Title", CONTENT[selected.id].title],
              ["Type", selected.type],
              ["Details", selected.meta],
              ["Status", selected.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-white/45">{k}</dt>
                <dd className="truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </AppWindow>
    </div>
  );
}

/* --------------------------------- Upload --------------------------------- */

export function UploadFlow() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 180, amount: 0.4 });
  // Opens mid-review, then loops: upload → read length → pending → approved.
  const cycle = (tick + 34) % 60;
  const progress = Math.min(100, cycle * 5);
  const uploaded = cycle >= 20;
  const approved = cycle >= 38;

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
      <div className="grid place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-7 text-center">
        <CloudUpload aria-hidden className="size-6 text-white/50" />
        <p className="mt-2 text-[14px]">Drop videos and images here</p>
        <p className="mt-1 text-[12px] text-white/40">MP4, MOV, WebM up to 200 MB · JPG, PNG, WebP, GIF up to 20 MB</p>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.07]">
        <span className="relative block h-12 w-20 shrink-0 overflow-hidden rounded-md">
          <Image src={CONTENT["weekend-brunch"].thumb} alt="" fill sizes="80px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px]">weekend-brunch.mp4</p>
          {uploaded ? (
            <p className="mt-1 flex items-center gap-2 text-[12px] text-white/50">
              <Film aria-hidden className="size-3.5" /> Video · length detected <span className="font-tech text-white/80">0:15</span>
            </p>
          ) : (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-white/80 transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        {uploaded ? (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11.5px] transition-colors",
              approved ? "bg-white/[0.08] text-white/80" : "bg-amber-400/10 text-amber-300",
            )}
          >
            {approved ? "Approved" : "Pending review"}
          </span>
        ) : (
          <span className="shrink-0 font-tech text-[12px] text-white/50">{progress}%</span>
        )}
      </div>

      <AnimatePresence>
        {approved ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 text-[12.5px] text-white/50"
          >
            <Check aria-hidden className="size-3.5 text-live" /> Approved by Wanjiku · just now
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
        {["brunch", "weekend", "promo"].map((tag) => (
          <span key={tag} className="rounded-md bg-white/[0.05] px-2 py-1 text-[12px] text-white/60">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Timeline -------------------------------- */

const SESSIONS = [
  { from: 7, to: 11.5, name: "Breakfast", content: "Breakfast menu", playlist: "Morning Acoustic", ads: false },
  { from: 12, to: 15, name: "Lunch", content: "Lunch menu · Chef’s special", playlist: "Lunch Rush", ads: true },
  { from: 15, to: 17, name: "Afternoon", content: "Brand film", playlist: "Lunch Rush", ads: true },
  { from: 17, to: 19, name: "Happy hour", content: "Happy hour", playlist: "Golden Hour", ads: false },
  { from: 19, to: 23, name: "Evening", content: "Dessert of the week", playlist: "Late Lounge", ads: true },
];
const START = 6;
const SPAN = 18;
const at = (h: number) => ((h - START) / SPAN) * 100;

export function ScheduleTimeline() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 120, amount: 0.35 });
  const now = 11 + ((tick % 400) / 400) * 9; // sweeps 11:00 → 20:00
  const current = SESSIONS.find((s) => now >= s.from && now < s.to);
  const hh = Math.floor(now);
  const mm = Math.floor((now - hh) * 60);

  const layers: { key: "content" | "playlist" | "ads"; label: string }[] = [
    { key: "content", label: "Content" },
    { key: "playlist", label: "Playlist" },
    { key: "ads", label: "Campaigns" },
  ];

  return (
    <div ref={ref}>
      <AppWindow path={["Schedules", "Main schedule"]} note={null} bodyClassName="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] text-white/60">
            <Target aria-hidden className="size-4 text-white/40" /> Westlands · Nyali · Milimani <span className="text-white/35">· 11 screens</span>
          </p>
          <span className="flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 text-[12px]">
            <StatusDot pulse /> Active
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[72px_1fr] items-center gap-3">
              <span />
              <div className="relative h-5">
                {SESSIONS.map((s) => (
                  <span
                    key={s.name}
                    className={cn("absolute truncate text-[12px] transition-colors", current?.name === s.name ? "text-white" : "text-white/45")}
                    style={{ left: `calc(${at(s.from)}% + 6px)`, width: `calc(${at(s.to) - at(s.from)}% - 8px)` }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              {layers.map((layer) => (
                <div key={layer.key} className="contents">
                  <span className="text-[12px] text-white/45">{layer.label}</span>
                  <div className="relative h-11 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05]">
                    {SESSIONS.map((s) => {
                      const on = current?.name === s.name;
                      const text = layer.key === "content" ? s.content : layer.key === "playlist" ? s.playlist : s.ads ? "Ad breaks" : "";
                      if (!text) return null;
                      return (
                        <span
                          key={s.name}
                          className={cn(
                            "absolute inset-y-1 flex items-center truncate rounded-md px-2 text-[11.5px] ring-1 transition-colors duration-500",
                            on ? "bg-brand/15 text-white ring-brand/40" : "bg-white/[0.04] text-white/60 ring-white/[0.06]",
                          )}
                          style={{ left: `calc(${at(s.from)}% + 2px)`, width: `calc(${at(s.to) - at(s.from)}% - 4px)` }}
                        >
                          {layer.key === "playlist" ? <Music2 aria-hidden className="mr-1 size-3 shrink-0" /> : null}
                          {text}
                        </span>
                      );
                    })}
                    <span aria-hidden className="absolute -inset-y-1 w-px bg-brand" style={{ left: `${at(now)}%` }} />
                  </div>
                </div>
              ))}
              <span />
              <div className="flex justify-between font-tech text-[10.5px] text-white/30">
                {[6, 9, 12, 15, 18, 21, 24].map((h) => (
                  <span key={h}>{String(h).padStart(2, "0")}:00</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12.5px] text-white/50">
          Now <span className="font-tech text-white">{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</span>
          {current ? (
            <>
              {" "}· <span className="text-white">{current.name}</span> — {current.content} with {current.playlist}
            </>
          ) : (
            " · Between sessions — screens play the zone’s usual music"
          )}
        </p>
      </AppWindow>
    </div>
  );
}

/* --------------------------------- Pattern --------------------------------- */

const PATTERN: { kind: "content" | "music"; id?: ContentId; label: string; secs: number }[] = [
  { kind: "content", id: "lunch-menu", label: "Lunch menu", secs: 3 },
  { kind: "content", id: "chefs-special", label: "Chef’s special", secs: 3 },
  { kind: "content", id: "happy-hour", label: "Happy hour", secs: 3 },
  { kind: "music", label: "10 min of music", secs: 5 },
];
const PATTERN_TOTAL = PATTERN.reduce((s, p) => s + p.secs, 0);

export function PeriodicPattern() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 250, amount: 0.35 });
  const t = (tick / 4) % PATTERN_TOTAL;
  let acc = 0;
  let activeIndex = 0;
  for (let i = 0; i < PATTERN.length; i++) {
    if (t >= acc && t < acc + PATTERN[i].secs) activeIndex = i;
    acc += PATTERN[i].secs;
  }
  const active = PATTERN[activeIndex];

  return (
    <div ref={ref} className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <ScreenFrame>
        <AnimatePresence initial={false}>
          <motion.div
            key={active.kind === "music" ? "music" : active.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            {active.kind === "content" && active.id ? (
              <ScreenSwap id={active.id} />
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-black">
                <Image src={PLAYLISTS[1].cover} alt="" fill sizes="40vw" className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-[5cqw] left-[5cqw]">
                  <p className="font-tech text-[1.8cqw] tracking-[0.16em] text-white/60 uppercase">Now playing</p>
                  <p className="mt-[0.8cqw] font-display text-[5cqw] leading-none font-semibold tracking-[-0.03em]">{PLAYLISTS[1].track}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </ScreenFrame>

      <div className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
        <div className="flex items-center justify-between">
          <Label>Pattern · periodic</Label>
          <span className="text-[12px] text-white/40">Repeats all session</span>
        </div>
        <ol className="mt-4 space-y-2">
          {PATTERN.map((p, i) => {
            const on = i === activeIndex;
            return (
              <li
                key={p.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2.5 ring-1 transition-colors duration-300",
                  on ? "bg-white/[0.07] ring-brand/40" : "bg-white/[0.02] ring-white/[0.06]",
                )}
              >
                {p.kind === "content" && p.id ? (
                  <span className="relative block h-9 w-14 shrink-0 overflow-hidden rounded-md">
                    <Image src={CONTENT[p.id].thumb} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                ) : (
                  <span className="grid h-9 w-14 shrink-0 place-items-center rounded-md bg-white/[0.06]">
                    <Equalizer bars={4} playing={on} className="h-3.5" barClassName="w-[2px]" />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-[13.5px]">{p.label}</span>
                <span className="font-tech text-[12px] text-white/45">{p.kind === "content" ? "0:15" : "10:00"}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4 text-[12px]">
          {["1", "5", "10", "15", "30", "60"].map((m) => (
            <span key={m} className={cn("rounded-md px-2 py-1", m === "10" ? "bg-white/[0.1] text-white" : "bg-white/[0.03] text-white/45")}>
              {m} min
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Live control ------------------------------- */

export function LiveControl() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: 3, interval: 3400, amount: 0.35 });
  const contentOrder: ContentId[] = ["lunch-menu", "chefs-special", "happy-hour"];
  const current = contentOrder[index];

  return (
    <div ref={ref}>
      <AppWindow path={["Schedules", "Lunch", "Live"]} note={null} bodyClassName="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <Label>On screen now</Label>
            <span className="flex items-center gap-1.5 text-[12px] text-white/45">
              <MonitorPlay aria-hidden className="size-3.5" /> 7 screens following
            </span>
          </div>
          <ScreenFrame className="mt-3">
            <ScreenSwap id={current} />
          </ScreenFrame>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => select((index + 1) % contentOrder.length)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[13px] font-medium text-ink transition-transform active:scale-[0.98]"
            >
              <SkipForward aria-hidden className="size-4" /> Skip content
            </button>
            <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.06] px-3 text-[13px] ring-1 ring-white/[0.08]">
              <Pause aria-hidden className="size-4" /> Pause
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.06] px-3 text-[13px] ring-1 ring-white/[0.08]">
              <Play aria-hidden className="size-4" /> Preview
            </span>
          </div>
        </div>
        <aside className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <Label>Up next</Label>
          <ul className="mt-3 space-y-1.5">
            {contentOrder.map((id, i) => (
              <li key={id} className={cn("flex items-center gap-3 rounded-lg p-2", i === index ? "bg-white/[0.06]" : "")}>
                <span className="relative block h-8 w-12 shrink-0 overflow-hidden rounded">
                  <Image src={CONTENT[id].thumb} alt="" fill sizes="48px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{CONTENT[id].title}</span>
                {i === index ? <StatusDot state="live" pulse /> : <span className="font-tech text-[11.5px] text-white/35">0:15</span>}
              </li>
            ))}
          </ul>
          <Label className="mt-5">Music</Label>
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06]">
            <span className="relative block size-9 shrink-0 overflow-hidden rounded-md">
              <Image src={PLAYLISTS[1].cover} alt="" fill sizes="36px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1 text-[13px]">
              <span className="block truncate">{PLAYLISTS[1].track}</span>
              <span className="block truncate text-[12px] text-white/40">Lunch Rush</span>
            </span>
            <Equalizer bars={3} className="h-3" barClassName="w-[2px]" />
          </div>
          <div className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[12.5px] text-white/35 ring-1 ring-white/[0.07]">
            <Search aria-hidden className="size-3.5" /> Play a specific song…
          </div>
        </aside>
      </AppWindow>
    </div>
  );
}

/* ------------------------------ On the screen ------------------------------ */

export function OnScreen() {
  const { ref, index } = useCycle<HTMLDivElement>({ count: 3, interval: 4200, amount: 0.35 });
  const ids: ContentId[] = ["brand-film", "weekend-brunch", "dessert-promo"];

  return (
    <div ref={ref} className="relative overflow-hidden rounded-[24px] bg-[#0e0d0c] px-[6%] pt-[6%] pb-[12%] ring-1 ring-white/[0.06]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_50%_70%_at_50%_0%,rgb(255_232_205/0.11),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[10%] border-t border-white/[0.08] bg-linear-to-b from-[#1a1918] to-[#0c0c0b]" />
      <div className="relative mx-auto max-w-[900px]">
        <ScreenFrame>
          <ScreenSwap id={ids[index]} />
          <div className="absolute top-[2.5cqw] right-[2.5cqw] z-10 flex items-center gap-[1cqw] rounded-full bg-black/55 px-[1.6cqw] py-[0.8cqw] text-[1.5cqw] text-white/85 backdrop-blur">
            <VolumeX aria-hidden className="size-[1.8cqw]" /> Video muted
            <span className="text-white/40">·</span>
            <Music2 aria-hidden className="size-[1.8cqw]" /> {PLAYLISTS[1].track}
          </div>
        </ScreenFrame>
        <p className="mt-3 text-center font-tech text-[11px] tracking-[0.1em] text-white/35 uppercase">Full screen · crossfades between items</p>
      </div>
    </div>
  );
}
