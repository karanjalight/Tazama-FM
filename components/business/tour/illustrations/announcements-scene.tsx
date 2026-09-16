"use client";

import { motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";

import { Chip, Icon, Label, LiveDot, ORIGIN_BOTTOM, ORIGIN_CENTER, Panel, Scene, Waveform, useLoop } from "./kit";

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

// Lanes panel geometry (panel-local).
const L = 16; // chart left
const R = 254; // chart right
const DIP_IN = 84; // music starts ducking
const DIP_OUT = 186; // music back to full
const HIGH = 178;
const LOW = 212;
const BASE = 234;

const musicLine = (low: number) =>
  `M${L} ${HIGH} L${DIP_IN} ${HIGH} C${DIP_IN + 10} ${HIGH} ${DIP_IN + 6} ${low} ${DIP_IN + 18} ${low} ` +
  `L${DIP_OUT - 18} ${low} C${DIP_OUT - 6} ${low} ${DIP_OUT - 10} ${HIGH} ${DIP_OUT} ${HIGH} L${R} ${HIGH}`;

// Music bars under the volume line. `duck` is how far each bar shrinks while the voice is on.
const BAR_STEP = (R - L) / 20;
const MUSIC_BARS = Array.from({ length: 20 }, (_, i) => {
  const x = L + i * BAR_STEP + (BAR_STEP - 6) / 2;
  const cx = x + 3;
  const h = Math.round(18 + 30 * Math.abs(Math.sin(i * 1.3 + 0.4) * Math.cos(i * 0.45)));
  const ramp = (a: number, b: number, v: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  const inDip = Math.min(ramp(DIP_IN, DIP_IN + 18, cx), 1 - ramp(DIP_OUT - 18, DIP_OUT, cx));
  const lineY = HIGH + (LOW - HIGH) * inDip;
  return { x: Math.round(x * 10) / 10, h, duck: Math.round(Math.min(1, (BASE - lineY - 4) / h) * 1000) / 1000 };
});

// One 7s cycle that starts (and rests) mid-announcement: voice on, music ducked.
const CYCLE = { duration: 7, ease: "easeInOut" as const };
const TIMES = [0, 0.32, 0.44, 0.7, 0.82, 1];
const SPEAKING = [1, 1, 0, 0, 1, 1];

export function AnnouncementsScene() {
  const loop = useLoop();
  const ducked = musicLine(LOW);
  const full = musicLine(HIGH);
  const lineFrames = [ducked, ducked, full, full, ducked, ducked];

  return (
    <Scene label="A microphone announcement playing while the background music volume dips, then recovers">
      {/* Microphone */}
      <motion.g initial={{ opacity: 1 }} {...withTimes(loop({ opacity: SPEAKING }, CYCLE), TIMES)}>
        {[0, 0.9].map((d) => (
          <motion.circle
            key={d}
            cx="98"
            cy="158"
            r="62"
            strokeWidth="1.5"
            fill="none"
            className="stroke-muted-foreground/35"
            style={ORIGIN_CENTER}
            initial={{ scale: d ? 1.24 : 1.1, opacity: d ? 0.2 : 0.45 }}
            {...loop({ scale: [1, 1.34], opacity: [0.6, 0] }, { duration: 1.8, delay: d, ease: "easeOut" })}
          />
        ))}
      </motion.g>
      <Panel x={36} y={96} w={124} h={124} r={62}>
        <Icon icon={Mic} x={40} y={40} size={44} />
      </Panel>
      <LiveDot cx={142} cy={112} r={5} />
      <Chip x={27} y={246} label="Happy hour · 4:50 PM" w={142} />

      {/* Voice + music lanes */}
      <Panel x={186} y={48} w={270} h={256}>
        <Icon icon={Mic} x={16} y={14} size={18} className="text-muted-foreground" />
        <Label x={40} y={28} size={12} weight={600} tone="strong">
          Voice
        </Label>
        <line x1={L} y1="80" x2={R} y2="80" strokeWidth="1.5" strokeDasharray="3 4" className="stroke-border" />

        <line x1="16" y1="130" x2="254" y2="130" strokeWidth="1.5" className="stroke-border" />

        <Icon icon={Volume2} x={16} y={144} size={18} className="text-muted-foreground" />
        <Label x={40} y={158} size={12} weight={600} tone="strong">
          Music
        </Label>

        <motion.g initial={{ opacity: 1 }} {...withTimes(loop({ opacity: SPEAKING }, CYCLE), TIMES)}>
          {[DIP_IN, DIP_OUT].map((x) => (
            <line key={x} x1={x} y1="46" x2={x} y2={BASE} strokeWidth="1.5" strokeDasharray="2 5" className="stroke-muted-foreground/35" />
          ))}
          <rect x={DIP_IN + 4} y="46" width={DIP_OUT - DIP_IN - 8} height="68" rx="10" className="fill-muted" />
          <Waveform x={DIP_IN + 14} y={52} w={DIP_OUT - DIP_IN - 24} h={56} bars={14} className="fill-foreground/75" />
        </motion.g>

        {MUSIC_BARS.map((bar) => (
          <motion.rect
            key={bar.x}
            x={bar.x}
            y={BASE - bar.h}
            width="6"
            height={bar.h}
            rx="3"
            className="fill-muted-foreground/30"
            style={ORIGIN_BOTTOM}
            initial={{ scaleY: bar.duck }}
            {...withTimes(loop({ scaleY: [bar.duck, bar.duck, 1, 1, bar.duck, bar.duck] }, CYCLE), TIMES)}
          />
        ))}
        <motion.path
          d={ducked}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-foreground/75"
          initial={{ d: ducked }}
          {...withTimes(loop({ d: lineFrames }, CYCLE), TIMES)}
        />
      </Panel>
    </Scene>
  );
}
