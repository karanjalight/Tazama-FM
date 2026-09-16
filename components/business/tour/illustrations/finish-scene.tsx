"use client";

import { motion } from "framer-motion";
import { ListMusic, MapPin, Tv, Users, type LucideIcon } from "lucide-react";

import { Icon, ORIGIN_CENTER, Panel, Scene, TextLine, useLoop } from "./kit";

/** One 10s cycle in 20 half-second steps (21 keyframes). */
const CYCLE = 10;
const STEPS = 20;
const FADE_AT = 19;

/** Keyframes at `from`, switching to `to` from step `on` through step `off`. */
function hold(on: number, off: number, from = 0, to = 1) {
  return Array.from({ length: STEPS + 1 }, (_, k) => (k >= on && k <= off ? to : from));
}

const ROWS: { icon: LucideIcon; title: number; detail: number }[] = [
  { icon: MapPin, title: 112, detail: 70 },
  { icon: Tv, title: 96, detail: 84 },
  { icon: ListMusic, title: 124, detail: 62 },
  { icon: Users, title: 88, detail: 76 },
];

/* Checklist panel geometry. */
const PX = 90;
const PY = 140;
const PW = 300;
const ROW_H = 44;

const CONFETTI: { x: number; y: number; shape: "rect" | "dot"; tone: string; rotate: number; duration: number; delay: number }[] = [
  { x: 70, y: 64, shape: "rect", tone: "fill-foreground/60", rotate: 20, duration: 7.5, delay: 0 },
  { x: 132, y: 34, shape: "dot", tone: "fill-muted-foreground/40", rotate: 0, duration: 8.5, delay: 1.6 },
  { x: 150, y: 104, shape: "rect", tone: "fill-muted-foreground/40", rotate: -35, duration: 8, delay: 3.1 },
  { x: 48, y: 170, shape: "dot", tone: "fill-foreground/60", rotate: 0, duration: 9, delay: 0.9 },
  { x: 58, y: 262, shape: "rect", tone: "fill-muted-foreground/40", rotate: 55, duration: 7, delay: 2.4 },
  { x: 342, y: 36, shape: "rect", tone: "fill-brand", rotate: -25, duration: 8, delay: 0.5 },
  { x: 328, y: 112, shape: "dot", tone: "fill-muted-foreground/40", rotate: 0, duration: 7.5, delay: 2.2 },
  { x: 412, y: 70, shape: "rect", tone: "fill-foreground/60", rotate: 40, duration: 8.5, delay: 1.2 },
  { x: 430, y: 160, shape: "rect", tone: "fill-muted-foreground/40", rotate: -15, duration: 7, delay: 3.4 },
  { x: 410, y: 250, shape: "dot", tone: "fill-foreground/60", rotate: 0, duration: 9, delay: 2.8 },
  { x: 436, y: 306, shape: "rect", tone: "fill-muted-foreground/40", rotate: 65, duration: 8, delay: 0.3 },
];

export function FinishScene() {
  const loop = useLoop();
  return (
    <Scene label="A setup checklist whose four items tick off one by one beneath a large check mark, with a little confetti">
      {CONFETTI.map((c, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 1 }}
          {...loop({ y: [-10, 22], opacity: [0, 1, 1, 0] }, { duration: c.duration, delay: c.delay, ease: "linear" })}
        >
          <g transform={`translate(${c.x} ${c.y})`}>
            <motion.rect
              x={c.shape === "rect" ? -6 : -4.5}
              y={c.shape === "rect" ? -3.5 : -4.5}
              width={c.shape === "rect" ? 12 : 9}
              height={c.shape === "rect" ? 7 : 9}
              rx={c.shape === "rect" ? 2 : 4.5}
              className={c.tone}
              style={ORIGIN_CENTER}
              initial={{ rotate: c.rotate }}
              {...loop({ rotate: [c.rotate, c.rotate + 160] }, { duration: c.duration, delay: c.delay, ease: "linear" })}
            />
          </g>
        </motion.g>
      ))}

      <circle cx={240} cy={96} r={70} className="fill-foreground/5" />
      <circle cx={240} cy={101} r={50} className="fill-foreground/5" />
      <circle cx={240} cy={96} r={50} strokeWidth="1.5" className="fill-card stroke-border" />
      <path d="M218 97 L233 112 L263 80" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="stroke-muted" />
      <motion.path
        d="M218 97 L233 112 L263 80"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-foreground"
        {...loop({ pathLength: hold(12, STEPS), opacity: hold(12, FADE_AT - 1) }, { duration: CYCLE })}
      />

      <Panel x={PX} y={PY} w={PW} h={ROWS.length * ROW_H + 12}>
        {ROWS.map((row, i) => {
          const top = 6 + i * ROW_H;
          const cy = top + ROW_H / 2;
          const s = 2 + i * 2;
          return (
            <g key={i}>
              {i > 0 && <line x1={18} x2={PW - 18} y1={top} y2={top} strokeWidth="1.5" className="stroke-border" />}
              <rect x={20} y={cy - 11} width={22} height={22} rx={7} strokeWidth="1.5" className="fill-card stroke-border" />
              <motion.rect
                x={20}
                y={cy - 11}
                width={22}
                height={22}
                rx={7}
                className="fill-foreground"
                style={ORIGIN_CENTER}
                {...loop({ scale: hold(s + 1, STEPS, 0.4), opacity: hold(s + 1, FADE_AT - 1) }, { duration: CYCLE })}
              />
              <motion.path
                d={`M26 ${cy} L29.5 ${cy + 3.5} L36 ${cy - 3.5}`}
                fill="none"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-background"
                {...loop({ pathLength: hold(s + 2, STEPS), opacity: hold(s + 2, FADE_AT - 1) }, { duration: CYCLE })}
              />
              <TextLine x={56} y={cy - 9} w={row.title} strong />
              <TextLine x={56} y={cy + 3} w={row.detail} />
              <Icon icon={row.icon} x={PW - 38} y={cy - 8} size={16} className="text-muted-foreground" />
            </g>
          );
        })}
      </Panel>
    </Scene>
  );
}
