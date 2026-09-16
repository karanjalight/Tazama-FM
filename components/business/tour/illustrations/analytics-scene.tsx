"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp } from "lucide-react";

import { Icon, Label, ORIGIN_CENTER, Panel, Scene, TextLine, useLoop } from "./kit";

/** framer-motion overrides a CSS transform-origin on SVG, so anchor scaling with its own origin values. */
const GROW_UP = { originY: 1 } as const;

/* Chart geometry, in chart-panel coordinates. */
const BASE = 228;
const PITCH = 36;
const BAR_W = 20;
const BAR_X0 = 26;
const BAR_H = [56, 80, 66, 98, 86, 112, 128];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const GRID_Y = [108, 148, 188];
const REACH_Y = [156, 134, 142, 114, 118, 96, 78];

/** Smooth curve through points (Catmull-Rom → cubic Bézier). */
function smoothPath(points: ReadonlyArray<readonly [number, number]>) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const REACH_POINTS = REACH_Y.map((y, i) => [BAR_X0 + i * PITCH + BAR_W / 2, y] as const);
const REACH_PATH = smoothPath(REACH_POINTS);
const REACH_END = REACH_POINTS[REACH_POINTS.length - 1];

/* Heatmap: days (columns) × dayparts (rows), levels 0–4. The single 4 is the brand peak. */
const HEAT = [
  [0, 1, 1, 1, 2, 2, 1],
  [1, 2, 1, 2, 3, 3, 2],
  [1, 2, 2, 3, 3, 4, 3],
  [0, 1, 1, 1, 2, 3, 2],
];
const HEAT_FILL = ["fill-foreground/5", "fill-foreground/15", "fill-foreground/30", "fill-foreground/50", "fill-foreground/70"];
const CELL = 13;
const CELL_GAP = 4;

const CYCLE = 7;

export function AnalyticsScene() {
  const loop = useLoop();
  return (
    <Scene label="A weekly analytics chart with rising bars and a reach trend line, a plus 18 percent reach badge and a busiest-hours heatmap">
      <g textRendering="geometricPrecision">
      <Panel x={24} y={42} w={300} h={270}>
        <TextLine x={22} y={24} w={66} strong />
        <Label x={22} y={68} size={26} weight={600} tone="strong">
          24.8k
        </Label>
        <Label x={100} y={68} size={11}>
          plays
        </Label>

        <rect x={206} y={18} width={72} height={26} rx={13} className="fill-muted" />
        <rect x={209} y={21} width={34} height={20} rx={10} strokeWidth="1.5" className="fill-card stroke-border" />
        <Label x={226} y={35} size={10.5} weight={600} tone="strong" anchor="middle">
          7d
        </Label>
        <Label x={260} y={35} size={10.5} anchor="middle">
          30d
        </Label>

        {GRID_Y.map((y) => (
          <line key={y} x1={22} x2={278} y1={y} y2={y} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" className="stroke-border" />
        ))}
        <line x1={22} x2={278} y1={BASE} y2={BASE} strokeWidth="1.5" className="stroke-border" />

        {BAR_H.map((h, i) => (
          <motion.rect
            key={i}
            x={BAR_X0 + i * PITCH}
            y={BASE - h}
            width={BAR_W}
            height={h}
            rx={5}
            className={i === BAR_H.length - 1 ? "fill-foreground/80" : "fill-muted-foreground/25"}
            style={GROW_UP}
            {...loop({ scaleY: [0.12, 1, 1, 1, 1, 1, 0.12] }, { duration: CYCLE, delay: i * 0.09 })}
          />
        ))}

        <motion.path
          d={REACH_PATH}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-card"
          {...loop({ pathLength: [0, 1, 1, 1, 1, 1, 0], opacity: [0, 1, 1, 1, 1, 1, 0] }, { duration: CYCLE, delay: 0.4 })}
        />
        <motion.path
          d={REACH_PATH}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-foreground/70"
          {...loop({ pathLength: [0, 1, 1, 1, 1, 1, 0], opacity: [0, 1, 1, 1, 1, 1, 0] }, { duration: CYCLE, delay: 0.4 })}
        />
        <motion.circle
          cx={REACH_END[0]}
          cy={REACH_END[1]}
          r={5}
          strokeWidth="2"
          className="fill-card stroke-foreground"
          style={ORIGIN_CENTER}
          {...loop({ scale: [0, 0, 1, 1, 1, 1, 0] }, { duration: CYCLE, delay: 0.4 })}
        />

        {DAYS.map((d, i) => (
          <Label key={i} x={BAR_X0 + i * PITCH + BAR_W / 2} y={250} size={10.5} anchor="middle">
            {d}
          </Label>
        ))}
      </Panel>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6 })}>
        <Panel x={318} y={82} w={126} h={44} r={22}>
          <circle cx={22} cy={22} r={14} className="fill-foreground" />
          <Icon icon={TrendingUp} x={14} y={14} size={16} className="text-background" />
          <Label x={44} y={26.5} size={12.5} weight={600} tone="strong">
            +18% reach
          </Label>
        </Panel>
      </motion.g>

      <motion.g {...loop({ y: [0, -5, 0] }, { duration: 6.5, delay: 1 })}>
        <Panel x={312} y={168} w={144} h={122}>
          <Icon icon={Clock} x={14} y={13} size={14} className="text-muted-foreground" />
          <TextLine x={34} y={17} w={56} strong />
          {HEAT.map((row, r) =>
            row.map((level, c) => {
              const x = 14.5 + c * (CELL + CELL_GAP);
              const y = 42 + r * (CELL + CELL_GAP);
              return level === 4 ? (
                <g key={`${r}-${c}`}>
                  <motion.rect
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={3.5}
                    className="fill-brand/35"
                    style={ORIGIN_CENTER}
                    initial={{ opacity: 0 }}
                    {...loop({ scale: [1, 2.2], opacity: [0.7, 0] }, { duration: 2.2, ease: "easeOut", repeatDelay: 0.6 })}
                  />
                  <rect x={x} y={y} width={CELL} height={CELL} rx={3.5} className="fill-brand" />
                </g>
              ) : (
                <rect key={`${r}-${c}`} x={x} y={y} width={CELL} height={CELL} rx={3.5} className={HEAT_FILL[level]} />
              );
            }),
          )}
        </Panel>
      </motion.g>
      </g>
    </Scene>
  );
}
