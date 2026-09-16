"use client";

import { motion } from "framer-motion";
import { CalendarClock, Image as ImageIcon, Megaphone, Music, type LucideIcon } from "lucide-react";

import { Chip, Equalizer, Icon, Label, Panel, Scene, TextLine, Waveform, useLoop } from "./kit";

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

// Timeline geometry (panel-local). 8am sits at TRACK_X; one hour = HOUR units; the day ends at 10pm.
const TRACK_X = 34;
const HOUR = 26;
const TRACK_END = TRACK_X + 14 * HOUR;
const at = (hour: number) => TRACK_X + (hour - 8) * HOUR;
const frac = (hour: number) => (hour - 8) / 14;

const SESSIONS: { from: number; to: number; icon: LucideIcon; tone: string; line?: number }[] = [
  { from: 8, to: 11.5, icon: Music, tone: "fill-muted stroke-border", line: 40 },
  { from: 11.5, to: 14, icon: ImageIcon, tone: "fill-foreground/15 stroke-transparent", line: 16 },
  { from: 14, to: 16, icon: Megaphone, tone: "fill-foreground/30 stroke-transparent" },
  { from: 16, to: 22, icon: Music, tone: "fill-muted stroke-border", line: 92 },
];

// One 18s "day": the playhead glides linearly and the session card below swaps as it crosses each boundary.
const DAY = { duration: 18, ease: "linear" as const };
const FADE = 0.015;

function cardTimes(i: number) {
  const start = frac(SESSIONS[i].from);
  const end = frac(SESSIONS[i].to);
  if (i === 0) return { opacity: [1, 1, 0, 0, 1], times: [0, end - FADE, end + FADE, 1 - 2 * FADE, 1] };
  if (i === SESSIONS.length - 1) return { opacity: [0, 0, 1, 1, 0], times: [0, start - FADE, start + FADE, 1 - 2 * FADE, 1] };
  return { opacity: [0, 0, 1, 1, 0, 0], times: [0, start - FADE, start + FADE, end - FADE, end + FADE, 1] };
}

export function SchedulesScene() {
  const loop = useLoop();
  const cards = [
    // Morning music
    <g key="music-am">
      <rect x="14" y="14" width="72" height="72" rx="10" className="fill-muted-foreground/20" />
      <Icon icon={Music} x={38} y={38} size={24} className="text-muted-foreground" />
      <TextLine x={102} y={24} w={116} h={8} strong />
      <TextLine x={102} y={42} w={80} />
      <Equalizer x={102} y={60} bars={4} h={18} />
    </g>,
    // Menu slideshow
    <g key="slides">
      <rect x="14" y="14" width="72" height="72" rx="10" className="fill-muted" />
      <Icon icon={ImageIcon} x={38} y={38} size={24} className="text-muted-foreground" />
      <TextLine x={102} y={24} w={96} h={8} strong />
      <TextLine x={102} y={42} w={120} />
      {[0, 1, 2].map((d) => (
        <circle key={d} cx={106 + d * 16} cy={70} r="4" className={d === 1 ? "fill-foreground/70" : "fill-muted-foreground/30"} />
      ))}
    </g>,
    // Announcement
    <g key="announce">
      <rect x="14" y="14" width="72" height="72" rx="10" className="fill-foreground/15" />
      <Icon icon={Megaphone} x={38} y={38} size={24} />
      <TextLine x={102} y={24} w={104} h={8} strong />
      <Waveform x={102} y={52} w={84} h={24} bars={12} className="fill-foreground/60" />
    </g>,
    // Evening music
    <g key="music-pm">
      <rect x="14" y="14" width="72" height="72" rx="10" className="fill-muted-foreground/20" />
      <Icon icon={Music} x={38} y={38} size={24} className="text-muted-foreground" />
      <TextLine x={102} y={24} w={88} h={8} strong />
      <TextLine x={102} y={42} w={110} />
      <Equalizer x={102} y={60} bars={4} h={18} />
    </g>,
  ];

  // Playhead rests just past 10am, inside the morning music session.
  const restX = Math.round(at(10.2) - TRACK_X);
  const travel = TRACK_END - TRACK_X;

  return (
    <Scene label="A day timeline of music, slides and an announcement, with a live playhead and the session now playing">
      <Panel x={24} y={32} w={432} h={160}>
        <Icon icon={CalendarClock} x={16} y={14} size={20} className="text-muted-foreground" />
        <Label x={44} y={29} size={12.5} weight={600} tone="strong">
          Today
        </Label>
        <TextLine x={336} y={21} w={80} />

        {[8, 12, 16, 20].map((hour) => (
          <g key={hour}>
            <Label x={at(hour)} y={62} anchor="middle">
              {hour === 12 ? "12pm" : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
            </Label>
            <line x1={at(hour)} y1="70" x2={at(hour)} y2="146" strokeWidth="1.5" strokeDasharray="3 4" className="stroke-border" />
          </g>
        ))}

        {SESSIONS.map((s) => {
          const x = at(s.from) + 2;
          const w = at(s.to) - at(s.from) - 4;
          return (
            <g key={s.from}>
              <rect x={x} y="80" width={w} height="56" rx="10" className="fill-card" />
              <rect x={x} y="80" width={w} height="56" rx="10" strokeWidth="1.5" className={s.tone} />
              <Icon icon={s.icon} x={x + 11} y={99} size={18} className="text-foreground/80" />
              {s.line && w > 80 && <TextLine x={x + 38} y={105} w={Math.min(s.line, w - 52)} />}
            </g>
          );
        })}

        {/* The "now" playhead */}
        <motion.g
          initial={{ x: restX, opacity: 1 }}
          {...withTimes(
            loop({ x: [0, travel * FADE * 2, travel * (1 - FADE * 2), travel], opacity: [0, 1, 1, 0] }, DAY),
            [0, FADE * 2, 1 - FADE * 2, 1],
          )}
        >
          <rect x={TRACK_X - 1} y="70" width="2.5" height="76" rx="1.25" className="fill-brand" />
          <circle cx={TRACK_X + 0.25} cy="70" r="5" className="fill-brand" />
        </motion.g>
      </Panel>

      <Panel x={88} y={216} w={304} h={100}>
        {cards.map((card, i) => {
          const { opacity, times } = cardTimes(i);
          return (
            <motion.g key={i} initial={{ opacity: i === 0 ? 1 : 0 }} {...withTimes(loop({ opacity }, DAY), times)}>
              {card}
            </motion.g>
          );
        })}
        <Chip x={196} y={62} label="Now playing" />
      </Panel>
    </Scene>
  );
}
