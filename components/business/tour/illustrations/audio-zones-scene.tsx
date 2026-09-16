"use client";

import { motion } from "framer-motion";
import { Link2, Volume2 } from "lucide-react";

import { FlowLine, Icon, Label, LiveDot, Panel, Scene, Speaker, TextLine, useLoop, type LoopOptions } from "./kit";

const ROOM_W = 128;
const ROOM_H = 130;
const ROOM_Y = 94;
const ROOMS_X = [36, 176, 316];
const LABEL_BARS = [44, 36, 50];

/** Speaker centre, room-local. */
const SPK = { x: 64, y: 78 };

/** Arc of radius r around the speaker on one side, spanning ±35°. */
function arc(r: number, side: 1 | -1) {
  const a = (35 * Math.PI) / 180;
  const dx = r * Math.cos(a) * side;
  const dy = r * Math.sin(a);
  return `M${SPK.x + dx} ${SPK.y - dy} A${r} ${r} 0 0 ${side === 1 ? 1 : 0} ${SPK.x + dx} ${SPK.y + dy}`;
}

/** Every room pulses on this one clock — that is the point of the picture. */
const PULSE: LoopOptions = { duration: 2.4, ease: "easeInOut" };
const INNER = [0.2, 1, 0.2, 0.2];
const OUTER = [0.2, 0.2, 1, 0.2];

/** Slider geometry, panel-local. */
const TRACK_X = 50;
const TRACK_W = 250;
const KNOB_X = 196;
const MAX_X = 256;

export function AudioZonesScene() {
  const loop = useLoop();
  return (
    <Scene label="Three rooms linked into one audio zone, their speakers playing in sync under a shared volume slider capped at a maximum">
      {ROOMS_X.map((rx, i) => (
        <FlowLine key={rx} d={`M240 56 C 240 76, ${rx + ROOM_W / 2} 72, ${rx + ROOM_W / 2} ${ROOM_Y}`} delay={i * 0.2} />
      ))}

      <g transform="translate(192 30)">
        <rect width="96" height="26" rx="13" strokeWidth="1.5" className="fill-card stroke-border" />
        <Icon icon={Link2} x={12} y={6} size={14} />
        <text x="32" y="17.5" fontSize="11" fontWeight="600" className="fill-foreground">
          Sync
        </text>
        <LiveDot cx={80} cy={13} r={3.5} />
      </g>

      {ROOMS_X.map((rx, i) => (
        <Panel key={rx} x={rx} y={ROOM_Y} w={ROOM_W} h={ROOM_H} r={14}>
          <TextLine x={14} y={15} w={LABEL_BARS[i]} strong />
          <Speaker x={SPK.x - 23} y={SPK.y - 33} w={46} h={66} />
          {([1, -1] as const).map((side) => (
            <g key={side}>
              <motion.path
                d={arc(34, side)}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-muted-foreground/50"
                {...loop({ opacity: INNER }, PULSE)}
              />
              <motion.path
                d={arc(47, side)}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-muted-foreground/50"
                {...loop({ opacity: OUTER }, PULSE)}
              />
            </g>
          ))}
        </Panel>
      ))}

      <Panel x={64} y={244} w={352} h={70} r={16}>
        <Icon icon={Volume2} x={16} y={26} size={18} className="text-muted-foreground" />
        <rect x={TRACK_X} y="32" width={TRACK_W} height="6" rx="3" className="fill-muted" />
        <motion.rect
          x={TRACK_X}
          y="32"
          width={KNOB_X - TRACK_X}
          height="6"
          rx="3"
          className="fill-foreground/70"
          initial={{ width: KNOB_X - TRACK_X }}
          {...loop({ width: [KNOB_X - TRACK_X, KNOB_X - TRACK_X + 14, KNOB_X - TRACK_X - 8, KNOB_X - TRACK_X] }, { duration: 7 })}
        />
        <line x1={MAX_X} x2={MAX_X} y1="22" y2="50" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-muted-foreground/60" />
        <Label x={MAX_X} y={62} size={10.5} anchor="middle">
          Max
        </Label>
        <motion.g {...loop({ x: [0, 14, -8, 0] }, { duration: 7 })}>
          <circle cx={KNOB_X} cy="35" r="9" strokeWidth="2" className="fill-card stroke-foreground/70" />
        </motion.g>
        <Label x={336} y={39.5} size={11} weight={600} tone="strong" anchor="end">
          62%
        </Label>
      </Panel>
    </Scene>
  );
}
