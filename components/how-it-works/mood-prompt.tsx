"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Cover } from "@/components/cover";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface Mood {
  id: string;
  chip: string;
  prompt: string;
  room: string;
  vibe: string;
  tags: string[];
  tracks: { title: string; artist: string }[];
}

/**
 * Example moods. Presentational only — no backend. The point is to *show* the
 * capability (describe a vibe → Tazama lines up a starting room) without
 * over-claiming: copy frames the result as a starting point you can shape.
 */
const MOODS: Mood[] = [
  {
    id: "birthday",
    chip: "Birthday",
    prompt: "a birthday party everyone sings at",
    room: "Birthday Bash",
    vibe: "Big, bright, everyone singing along.",
    tags: ["Afrobeats", "Pop", "Throwbacks"],
    tracks: [
      { title: "Soweto", artist: "Victony" },
      { title: "Calm Down", artist: "Rema" },
      { title: "Unavailable", artist: "Davido" },
    ],
  },
  {
    id: "wedding",
    chip: "Wedding",
    prompt: "a wedding, first dance into the after-party",
    room: "First Dance",
    vibe: "Tender to start, dancing by midnight.",
    tags: ["Soul", "Amapiano", "Classics"],
    tracks: [
      { title: "Sweet Love", artist: "Sauti Sol" },
      { title: "Beautiful", artist: "Mafikizolo" },
      { title: "Asibe Happy", artist: "Kabza De Small" },
    ],
  },
  {
    id: "road-trip",
    chip: "Road trip",
    prompt: "a long road trip with the windows down",
    room: "Open Road",
    vibe: "Windows down, momentum building.",
    tags: ["Afro-pop", "Hip-hop", "Feel-good"],
    tracks: [
      { title: "Sungba", artist: "Asake" },
      { title: "Terminator", artist: "King Promise" },
      { title: "Free", artist: "Ruger" },
    ],
  },
  {
    id: "sunday-chill",
    chip: "Sunday chill",
    prompt: "a slow Sunday morning, nothing to do",
    room: "Slow Sunday",
    vibe: "Warm, unhurried, easy on the ears.",
    tags: ["Lo-fi", "Soul", "Acoustic"],
    tracks: [
      { title: "Niko Sawa", artist: "Bensoul" },
      { title: "Sailors", artist: "H_art the Band" },
      { title: "Sober", artist: "Lojay" },
    ],
  },
  {
    id: "gym",
    chip: "Gym",
    prompt: "a gym session, keep the energy up",
    room: "Pace Setter",
    vibe: "Relentless, high-energy, no breaks.",
    tags: ["Amapiano", "Drill", "Electronic"],
    tracks: [
      { title: "Yaba Buluku", artist: "DJ Tarico" },
      { title: "Rush", artist: "Ayra Starr" },
      { title: "Soso", artist: "Omah Lay" },
    ],
  },
  {
    id: "late-night",
    chip: "Late night",
    prompt: "just past midnight, lights low",
    room: "After Hours",
    vibe: "Moody, deep, just past midnight.",
    tags: ["R&B", "Deep House", "Jazz"],
    tracks: [
      { title: "Bandana", artist: "Fireboy DML" },
      { title: "Loyal", artist: "Tay Iwar" },
      { title: "Gyalis", artist: "Capella Grey" },
    ],
  },
];

/** Interactive showcase for AI Mood Prompts: pick a vibe, see the room Tazama lines up. */
export function MoodPrompt() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const mood = MOODS[active];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft dark:shadow-none">
      <div className="grid lg:grid-cols-2">
        {/* Prompt + mood chips */}
        <div className="border-b border-border p-7 sm:p-9 lg:border-r lg:border-b-0">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
            Mood prompt
          </span>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Tell Tazama the moment. It lines up a room with a name, a mood, and a
            starting queue — yours to keep shaping.
          </p>

          <div className="mt-5 rounded-2xl border border-border bg-muted/40 px-4 py-3.5 font-mono text-sm text-foreground">
            <span className="text-muted-foreground">mood&nbsp;›&nbsp;</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mood.id}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
                className="inline"
              >
                {mood.prompt}
              </motion.span>
            </AnimatePresence>
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-foreground align-middle animate-progress-pulse"
            />
          </div>

          <p className="mt-5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Try a vibe
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {MOODS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  i === active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {m.chip}
              </button>
            ))}
          </div>
        </div>

        {/* Assembled room */}
        <div className="p-7 sm:p-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={mood.id}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
            >
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Tazama suggests
              </p>
              <h3 className="text-display mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                {mood.room}
              </h3>
              <p className="mt-1.5 text-muted-foreground">{mood.vibe}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {mood.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {mood.tracks.map((t) => (
                  <Cover key={t.title} title={t.title} className="w-full rounded-xl" />
                ))}
              </div>

              <ul className="mt-4 space-y-1.5">
                {mood.tracks.map((t, i) => (
                  <li key={t.title} className="flex items-center gap-2.5 text-sm">
                    <span className="w-4 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">{t.title}</span>
                    <span className="truncate text-muted-foreground">
                      · {t.artist}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
