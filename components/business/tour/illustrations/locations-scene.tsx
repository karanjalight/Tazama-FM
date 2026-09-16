"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Chip, Equalizer, LiveDot, Panel, Pointer, Scene, TextLine, useLoop } from "./kit";

const MAP_W = 432;
const MAP_H = 292;

/** City blocks (panel-local); the gaps between them read as streets. */
const BLOCKS: [number, number, number, number][] = [
  [16, 16, 82, 70],
  [112, 16, 92, 70],
  [218, 16, 84, 70],
  [316, 16, 100, 70],
  [16, 100, 82, 76],
  [112, 100, 40, 76],
  [164, 100, 40, 76],
  [218, 100, 84, 76],
  [316, 100, 100, 76],
  [16, 190, 82, 86],
  [112, 190, 92, 86],
  [218, 190, 84, 86],
  [316, 190, 100, 36],
  [316, 238, 100, 38],
];

const AVENUE = "M-12 250 C 110 214, 300 118, 444 70";

interface PinSpec {
  x: number;
  y: number;
  r: number;
  live?: boolean;
  bars: [number, number];
  bob: { duration: number; delay: number };
}

const PINS: PinSpec[] = [
  { x: 96, y: 208, r: 12, bars: [46, 30], bob: { duration: 5.4, delay: 0.6 } },
  { x: 214, y: 136, r: 15, live: true, bars: [42, 28], bob: { duration: 6, delay: 0 } },
  { x: 334, y: 204, r: 12, bars: [50, 34], bob: { duration: 5.8, delay: 1.2 } },
];

function pinPath(r: number) {
  const t = r * 2.25;
  const c = r / t;
  const s = Math.sqrt(1 - c * c);
  return `M0 ${t} L${-r * s} ${r * c} A${r} ${r} 0 1 1 ${r * s} ${r * c} Z`;
}

function MapPin({ pin }: { pin: PinSpec }) {
  const loop = useLoop();
  const cardW = 84;
  const cardH = 34;
  return (
    <g>
      <ellipse cx={pin.x} cy={pin.y + pin.r * 2.25} rx={pin.r * 0.7} ry="3" className="fill-foreground/10" />
      <motion.g {...loop({ y: [0, -5, 0] }, pin.bob)}>
        <Panel x={pin.x - cardW / 2} y={pin.y - pin.r - 12 - cardH} w={cardW} h={cardH} r={10}>
          <TextLine x={11} y={9} w={pin.bars[0]} strong />
          <TextLine x={11} y={20} w={pin.bars[1]} />
          {pin.live && <Equalizer x={cardW - 22} y={11} bars={3} h={12} barW={2.5} gap={2} />}
        </Panel>
        <g transform={`translate(${pin.x} ${pin.y})`}>
          <path d={pinPath(pin.r)} strokeWidth="1.5" strokeLinejoin="round" className="fill-foreground stroke-foreground" />
          {pin.live ? (
            <LiveDot cx={0} cy={0} r={pin.r * 0.36} />
          ) : (
            <circle r={pin.r * 0.38} className="fill-card" />
          )}
        </g>
      </motion.g>
    </g>
  );
}

export function LocationsScene() {
  const loop = useLoop();
  const clipId = `tour-map-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Scene label="A city map with three business locations pinned, one of them live, and a button to add another location">
      <Panel x={24} y={34} w={MAP_W} h={MAP_H} r={18}>
        <defs>
          <clipPath id={clipId}>
            <rect width={MAP_W} height={MAP_H} rx="18" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {BLOCKS.map(([bx, by, bw, bh]) => (
            <rect key={`${bx}-${by}`} x={bx} y={by} width={bw} height={bh} rx="8" className="fill-muted" />
          ))}
          <path d={AVENUE} fill="none" strokeWidth="18" className="stroke-card" />
          <path d={AVENUE} fill="none" strokeWidth="1.5" strokeDasharray="6 7" className="stroke-border" />
        </g>

        {PINS.map((pin) => (
          <MapPin key={`${pin.x}-${pin.y}`} pin={pin} />
        ))}
      </Panel>

      <Chip x={326} y={50} label="+ Add location" />
      <motion.g initial={{ x: 0, y: 0 }} {...loop({ x: [0, -3, 0], y: [0, -2, 0] }, { duration: 5, delay: 0.4 })}>
        <Pointer x={420} y={67} />
      </motion.g>
    </Scene>
  );
}
