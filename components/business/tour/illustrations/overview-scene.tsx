"use client";

import { motion } from "framer-motion";
import { MapPin, Monitor, Music, Speaker as SpeakerIcon, type LucideIcon } from "lucide-react";

import { Equalizer, Icon, Label, LiveDot, Panel, Scene, TextLine, useLoop, type LoopOptions } from "./kit";

const STATS: { icon: LucideIcon; value: string; bar: number }[] = [
  { icon: MapPin, value: "6", bar: 44 },
  { icon: Monitor, value: "14", bar: 54 },
  { icon: SpeakerIcon, value: "9", bar: 38 },
];

const LINE = "M20 184 C 40 180, 48 164, 68 166 S 98 180, 118 160 S 148 132, 168 140 S 202 114, 224 106";
const DONUT = { cx: 318, cy: 146, r: 36 };
const CIRC = 2 * Math.PI * DONUT.r;
const ONLINE = CIRC * 0.74;
const OFFLINE = CIRC * 0.12;
const GAP = CIRC * 0.02;

export function OverviewScene() {
  const loop = useLoop();
  // Draw → hold → fade, so the restart is invisible.
  const draw: LoopOptions = { duration: 6.5, ease: ["easeInOut", "linear", "easeIn"] };
  return (
    <Scene label="A business dashboard with location, screen and speaker counts, a traffic chart, 12 screens online and the song now playing">
      <motion.g {...loop({ y: [0, -3, 0] }, { duration: 7 })}>
        <Panel x={36} y={32} w={408} h={292} r={18}>
          {STATS.map((s, i) => (
            <g key={s.value} transform={`translate(${16 + i * 130} 16)`}>
              <rect width="116" height="60" rx="11" className="fill-muted/70" />
              <Icon icon={s.icon} x={12} y={11} size={15} className="text-muted-foreground" />
              <TextLine x={34} y={15.5} w={s.bar} />
              <Label x={12} y={49} size={20} weight={600} tone="strong">
                {s.value}
              </Label>
            </g>
          ))}

          {[98, 130, 162, 194].map((gy) => (
            <line key={gy} x1="16" x2="236" y1={gy} y2={gy} strokeWidth="1.5" className="stroke-border" />
          ))}
          <motion.path
            d={`${LINE} L224 194 L20 194 Z`}
            className="fill-foreground/5"
            {...loop({ opacity: [0, 1, 1, 0] }, draw)}
          />
          <motion.path
            d={LINE}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-foreground/75"
            {...loop({ pathLength: [0, 1, 1, 1], opacity: [1, 1, 1, 0] }, draw)}
          />
          <motion.circle
            cx="224"
            cy="106"
            r="5"
            strokeWidth="2.5"
            className="fill-card stroke-foreground/75"
            {...loop({ opacity: [0, 1, 1, 0] }, draw)}
          />

          <g transform={`rotate(-90 ${DONUT.cx} ${DONUT.cy})`}>
            <circle cx={DONUT.cx} cy={DONUT.cy} r={DONUT.r} fill="none" strokeWidth="12" className="stroke-muted" />
            <circle
              cx={DONUT.cx}
              cy={DONUT.cy}
              r={DONUT.r}
              fill="none"
              strokeWidth="12"
              strokeDasharray={`${ONLINE} ${CIRC - ONLINE}`}
              className="stroke-foreground/70"
            />
            <circle
              cx={DONUT.cx}
              cy={DONUT.cy}
              r={DONUT.r}
              fill="none"
              strokeWidth="12"
              strokeDasharray={`${OFFLINE} ${CIRC - OFFLINE}`}
              strokeDashoffset={-(ONLINE + GAP)}
              className="stroke-muted-foreground/35"
            />
          </g>
          <Icon icon={Monitor} x={DONUT.cx - 10} y={DONUT.cy - 10} size={20} className="text-muted-foreground" />
          <LiveDot cx={289} cy={204.5} />
          <Label x={299} y={208.5} size={11}>
            12 online
          </Label>

          <rect x="16" y="222" width="376" height="54" rx="12" className="fill-muted/70" />
          <rect x="24" y="230" width="38" height="38" rx="8" className="fill-muted-foreground/20" />
          <Icon icon={Music} x={35} y={241} size={16} className="text-muted-foreground" />
          <TextLine x={74} y={237} w={108} strong />
          <TextLine x={74} y={252} w={72} />
          <rect x="206" y="245.5" width="128" height="5" rx="2.5" className="fill-muted-foreground/20" />
          <motion.rect
            x="206"
            y="245.5"
            width="128"
            height="5"
            rx="2.5"
            className="fill-foreground/60"
            style={{ originX: 0 }}
            initial={{ scaleX: 0.55 }}
            {...loop({ scaleX: [0.15, 0.9] }, { duration: 12, ease: "linear" })}
          />
          <Equalizer x={354} y={241} />
        </Panel>
      </motion.g>
    </Scene>
  );
}
