"use client";

import { motion } from "framer-motion";
import { Music } from "lucide-react";

import { Chip, Equalizer, Icon, Label, Panel, Scene, useLoop } from "./kit";

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BAR: Room = { x: 60, y: 96, w: 100, h: 88 };
const LOUNGE: Room = { x: 170, y: 96, w: 106, h: 88 };
const DINING: Room = { x: 60, y: 194, w: 216, h: 102 };
const DECK: Room = { x: 312, y: 96, w: 108, h: 94 };
const GARDEN: Room = { x: 312, y: 200, w: 108, h: 96 };
const ROOMS = [BAR, LOUNGE, DINING, DECK, GARDEN];

/** The spotlight's route; each stop is held for one segment, then it glides on. */
const ROUTE = [BAR, LOUNGE, DECK, GARDEN, DINING];
const STOPS = [...ROUTE.flatMap((r) => [r, r]), BAR];
const PAD = 5;
const PILL_W = 44;

export function RoomsZonesScene() {
  const loop = useLoop();
  const timing = { duration: 13, ease: "easeInOut" as const };
  return (
    <Scene label="A venue floor plan split into a Ground Floor zone and a Terrace zone, with music moving from room to room">
      <Panel x={32} y={50} w={416} h={272} r={18} />

      <rect x="48" y="72" width="240" height="236" rx="12" fill="none" strokeWidth="1.5" strokeDasharray="6 5" className="stroke-muted-foreground/40" />
      <rect x="300" y="72" width="132" height="236" rx="12" fill="none" strokeWidth="1.5" strokeDasharray="6 5" className="stroke-muted-foreground/40" />

      {ROOMS.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} rx="10" className="fill-muted" />
      ))}

      {/* Bar: label, counter and stools */}
      <Label x={BAR.x + 12} y={BAR.y + 23} size={11.5} weight={600} tone="strong">
        Bar
      </Label>
      <rect x={BAR.x + 12} y={BAR.y + 50} width="76" height="12" rx="6" className="fill-muted-foreground/25" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={BAR.x + 22 + i * 19} cy={BAR.y + 73} r="5" className="fill-muted-foreground/20" />
      ))}

      {/* Lounge: sofa and a coffee table */}
      <rect x={LOUNGE.x + 14} y={LOUNGE.y + 18} width="78" height="16" rx="8" className="fill-muted-foreground/20" />
      <circle cx={LOUNGE.x + 53} cy={LOUNGE.y + 58} r="12" className="fill-muted-foreground/20" />

      {/* Dining: two rows of tables */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={DINING.x + 34 + i * 50} cy={DINING.y + 32} r="11" className="fill-muted-foreground/20" />
          <circle cx={DINING.x + 34 + i * 50} cy={DINING.y + 72} r="11" className="fill-muted-foreground/20" />
        </g>
      ))}

      {/* Terrace: umbrellas and planters */}
      {[
        [DECK.x + 32, DECK.y + 34],
        [DECK.x + 76, DECK.y + 62],
      ].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r="17" className="fill-muted-foreground/15" />
          <circle cx={cx} cy={cy} r="4" className="fill-muted-foreground/35" />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={GARDEN.x + 14 + i * 30} y={GARDEN.y + 60} width="20" height="20" rx="10" className="fill-muted-foreground/20" />
      ))}
      <rect x={GARDEN.x + 14} y={GARDEN.y + 18} width="80" height="14" rx="7" className="fill-muted-foreground/15" />

      <Chip x={60} y={61} label="Ground Floor" />
      <Chip x={312} y={61} label="Terrace" />

      {/* Spotlight that follows the music from room to room */}
      <motion.g
        {...loop(
          { x: STOPS.map((r) => r.x - BAR.x), y: STOPS.map((r) => r.y - BAR.y) },
          timing,
        )}
      >
        <motion.rect
          x={BAR.x - PAD}
          y={BAR.y - PAD}
          width={BAR.w + PAD * 2}
          height={BAR.h + PAD * 2}
          rx="14"
          fill="none"
          strokeWidth="2"
          className="stroke-foreground"
          initial={{ width: BAR.w + PAD * 2, height: BAR.h + PAD * 2 }}
          {...loop({ width: STOPS.map((r) => r.w + PAD * 2), height: STOPS.map((r) => r.h + PAD * 2) }, timing)}
        />
      </motion.g>
      <motion.g
        {...loop(
          { x: STOPS.map((r) => r.x + r.w - (BAR.x + BAR.w)), y: STOPS.map((r) => r.y - BAR.y) },
          timing,
        )}
      >
        <g transform={`translate(${BAR.x + BAR.w + PAD - PILL_W + 10} ${BAR.y - PAD - 11})`}>
          <rect width={PILL_W} height="22" rx="11" className="fill-foreground" />
          <Icon icon={Music} x={8} y={4} size={14} className="text-background" />
          <Equalizer x={26} y={6} bars={3} h={10} barW={2} gap={2} />
        </g>
      </motion.g>
    </Scene>
  );
}
