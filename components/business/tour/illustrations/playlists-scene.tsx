"use client";

import { motion } from "framer-motion";
import { Music, Play, Sparkles } from "lucide-react";

import { Chip, Equalizer, FlowLine, Icon, Label, ORIGIN_CENTER, Panel, Scene, TextLine, useLoop } from "./kit";

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

const PANEL = { x: 64, y: 88, w: 352, h: 246 };
const ROW_H = 38;
const ROWS = [
  { title: 118, sub: 72, time: "3:24" },
  { title: 92, sub: 60, time: "4:02" },
  { title: 108, sub: 80, time: "2:58" },
  { title: 84, sub: 56, time: "3:41" },
];

// 9s generation cycle. It starts (and rests) with every track in place, clears them,
// then writes them back one by one.
const GEN_CYCLE = { duration: 9, ease: "easeInOut" as const };

export function PlaylistsScene() {
  const loop = useLoop();
  return (
    <Scene label="Genres flowing into AI, which writes a new playlist track by track">
      <FlowLine d="M136 44 C 136 66, 196 64, 222 76" />
      <FlowLine d="M240 44 L 240 74" delay={0.4} />
      <FlowLine d="M344 44 C 344 66, 284 64, 258 76" delay={0.8} />

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 5.5 })}>
        <Chip x={98} y={22} label="Afrobeats" />
      </motion.g>
      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6, delay: 0.9 })}>
        <Chip x={217} y={22} label="Jazz" />
      </motion.g>
      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 5, delay: 0.5 })}>
        <Chip x={318} y={22} label="Lo-fi" />
      </motion.g>

      <Panel x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h}>
        {/* Header */}
        <rect x="18" y="22" width="58" height="58" rx="10" className="fill-muted-foreground/20" />
        <Icon icon={Music} x={35} y={39} size={24} className="text-muted-foreground" />
        <TextLine x={92} y={34} w={120} h={8} strong />
        <TextLine x={92} y={52} w={74} />
        <circle cx="314" cy="51" r="17" className="fill-foreground" />
        <Icon icon={Play} x={307} y={43} size={16} className="fill-background text-background" />

        {/* Skeleton slots the tracks are written into */}
        {ROWS.map((row, i) => {
          const top = 94 + i * ROW_H;
          return (
            <g key={`slot-${row.time}`}>
              <rect x="44" y={top + 5} width="24" height="24" rx="6" className="fill-muted" />
              <rect x="80" y={top + 9} width={row.title} height="6" rx="3" className="fill-muted" />
              <rect x="80" y={top + 21} width={row.sub} height="6" rx="3" className="fill-muted" />
            </g>
          );
        })}

        {/* Tracks, written in one by one */}
        {ROWS.map((row, i) => {
          const top = 94 + i * ROW_H;
          const inAt = 0.22 + i * 0.07;
          return (
            <motion.g
              key={row.time}
              initial={{ opacity: 1, x: 0 }}
              {...withTimes(
                loop({ opacity: [1, 1, 0, 0, 1, 1], x: [0, 0, 0, -8, 0, 0] }, GEN_CYCLE),
                [0, 0.1, 0.16, inAt, inAt + 0.06, 1],
              )}
            >
              {i === 0 ? (
                <rect x="10" y={top} width="332" height={ROW_H - 4} rx="9" className="fill-muted" />
              ) : (
                <line x1="18" y1={top - 2} x2="334" y2={top - 2} strokeWidth="1.5" className="stroke-border" />
              )}
              {i === 0 ? (
                <Equalizer x={18} y={top + 9} bars={3} h={16} />
              ) : (
                <Label x={26} y={top + 21} anchor="middle" mono>
                  {i + 1}
                </Label>
              )}
              <rect x="44" y={top + 5} width="24" height="24" rx="6" className={i === 0 ? "fill-muted-foreground/25" : "fill-muted-foreground/20"} />
              <TextLine x={80} y={top + 9} w={row.title} strong />
              <TextLine x={80} y={top + 21} w={row.sub} />
              <Label x={330} y={top + 21} anchor="end" mono>
                {row.time}
              </Label>
            </motion.g>
          );
        })}
      </Panel>

      {/* AI badge straddling the playlist's top edge */}
      <g transform="translate(212 76)">
        <rect width="56" height="26" rx="13" strokeWidth="1.5" className="fill-foreground stroke-foreground" />
        <motion.g
          style={ORIGIN_CENTER}
          {...loop({ scale: [1, 1.18, 1], rotate: [0, 12, 0] }, { duration: 2.4 })}
        >
          <Icon icon={Sparkles} x={9} y={5} size={16} className="text-background" />
        </motion.g>
        <Label x={30} y={17.5} size={11.5} weight={600} tone="inverse">
          AI
        </Label>
      </g>
    </Scene>
  );
}
