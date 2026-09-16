"use client";

import { motion } from "framer-motion";
import { ArrowDown, CalendarDays, Check, MapPin } from "lucide-react";

import { Chip, Icon, Label, ORIGIN_CENTER, Panel, Scene, TextLine, useLoop } from "./kit";

const CHART_BARS = [28, 40, 34, 52, 44, 60, 48, 66];
const TABLE_ROWS = [
  { name: 74, value: 26 },
  { name: 58, value: 32 },
  { name: 86, value: 22 },
  { name: 64, value: 30 },
];

/** Download cycle: 12 half-second steps → 13 keyframes. */
const CYCLE = 6;
const RING = [0, 0.2, 0.4, 0.6, 0.8, 1, 1, 1, 1, 1, 1, 1, 0];
const RING_OPACITY = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
const ARROW_Y = [0, 5, 0, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0];
const BADGE = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0];

/** A filter pill with a leading icon. */
function FilterPill({ x, y, w, icon, label }: { x: number; y: number; w: number; icon: typeof MapPin; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="4" width={w} height="30" rx="15" className="fill-foreground/5" />
      <rect width={w} height="30" rx="15" strokeWidth="1.5" className="fill-card stroke-border" />
      <Icon icon={icon} x={11} y={8} size={14} className="text-muted-foreground" />
      <Label x={31} y={19.5} size={11} weight={500} tone="strong">
        {label}
      </Label>
    </g>
  );
}

export function ReportsScene() {
  const loop = useLoop();
  return (
    <Scene label="A PDF performance report with a bar chart and table, filtered by date and location, being downloaded">
      <g textRendering="geometricPrecision">
      <g transform="rotate(-7 194 186)">
        <Panel x={92} y={52} w={204} h={268}>
          <TextLine x={20} y={24} w={70} strong />
          <rect x={20} y={48} width={164} height={64} rx={8} className="fill-muted" />
          <TextLine x={20} y={132} w={120} />
          <TextLine x={20} y={150} w={92} />
          <TextLine x={20} y={168} w={108} />
        </Panel>
      </g>

      <motion.g {...loop({ y: [0, -3, 0] }, { duration: 7 })}>
        <Panel x={144} y={34} w={220} h={292}>
          <rect x={20} y={20} width={24} height={24} rx={7} className="fill-foreground" />
          <TextLine x={54} y={22} w={76} strong />
          <TextLine x={54} y={35} w={50} />
          <Chip x={160} y={21} label="PDF" />
          <line x1={20} x2={200} y1={60} y2={60} strokeWidth="1.5" className="stroke-border" />

          <line x1={20} x2={200} y1={146} y2={146} strokeWidth="1.5" className="stroke-border" />
          {CHART_BARS.map((h, i) => (
            <rect
              key={i}
              x={24 + i * 22}
              y={146 - h}
              width={13}
              height={h}
              rx={3.5}
              className={i === CHART_BARS.length - 1 ? "fill-foreground/75" : "fill-muted-foreground/25"}
            />
          ))}

          {TABLE_ROWS.map((row, i) => {
            const y = 170 + i * 26;
            return (
              <g key={i}>
                <rect x={20} y={y - 1} width={8} height={8} rx={2.5} className="fill-muted-foreground/30" />
                <TextLine x={36} y={y} w={row.name} />
                <TextLine x={200 - row.value} y={y} w={row.value} strong />
                {i < TABLE_ROWS.length - 1 && (
                  <line x1={20} x2={200} y1={y + 16} y2={y + 16} strokeWidth="1.5" className="stroke-border" />
                )}
              </g>
            );
          })}
        </Panel>
      </motion.g>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6, delay: 0.6 })}>
        <FilterPill x={26} y={214} w={120} icon={CalendarDays} label="Last 30 days" />
        <FilterPill x={40} y={254} w={116} icon={MapPin} label="All locations" />
      </motion.g>

      <g>
        <Panel x={350} y={210} w={104} h={104} r={52}>
          <circle cx={52} cy={52} r={38} fill="none" strokeWidth="3" className="stroke-muted" />
          <g transform="rotate(-90 52 52)">
            <motion.circle
              cx={52}
              cy={52}
              r={38}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-brand"
              {...loop({ pathLength: RING, opacity: RING_OPACITY }, { duration: CYCLE, ease: "linear" })}
            />
          </g>
          <motion.g {...loop({ y: ARROW_Y }, { duration: CYCLE })}>
            <Icon icon={ArrowDown} x={36} y={30} size={32} />
          </motion.g>
          <rect x={38} y={68} width={28} height={4} rx={2} className="fill-foreground" />
        </Panel>
        <motion.g style={ORIGIN_CENTER} {...loop({ scale: BADGE, opacity: BADGE }, { duration: CYCLE })}>
          <circle cx={436} cy={228} r={16} strokeWidth="3" className="fill-foreground stroke-card" />
          <Icon icon={Check} x={428} y={220} size={16} className="text-background" />
        </motion.g>
      </g>
      </g>
    </Scene>
  );
}
