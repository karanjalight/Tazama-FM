"use client";

import { motion } from "framer-motion";
import { Flame, Heart, Music, PartyPopper, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";

import { Avatar, Equalizer, Icon, Label, LiveDot, ORIGIN_CENTER, Panel, PhoneFrame, Scene, TextLine, TvFrame, useLoop } from "./kit";

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

// Reactions share one 9s cycle of 12 even steps. A bubble rises for 6 steps, resets
// while invisible, then waits. Each bubble is the same track shifted by whole steps,
// so step 0 (the resting frame) already shows a few bubbles mid-flight.
const STEPS = 12;
const RISE = 6;
const LIFT = 22;
const REACTION_CYCLE = { duration: 9, ease: "linear" as const };

function track(shift: number) {
  const y: number[] = [];
  const opacity: number[] = [];
  const scale: number[] = [];
  const x: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const s = (i + shift) % STEPS;
    const rising = s <= RISE;
    y.push(rising ? -s * LIFT : 0);
    opacity.push(rising && s > 0 && s < RISE ? 1 : 0);
    scale.push(rising && s > 0 ? 1 : 0.6);
    x.push(rising ? [0, 3, 4, 1, -3, -4, -2][s] : 0);
  }
  return { y, opacity, scale, x };
}

const REACTIONS: { icon: LucideIcon; cx: number; shift: number; filled?: boolean }[] = [
  { icon: Heart, cx: 238, shift: 3, filled: true },
  { icon: Flame, cx: 276, shift: 1 },
  { icon: PartyPopper, cx: 258, shift: 5 },
  { icon: ThumbsUp, cx: 280, shift: 8 },
  { icon: Sparkles, cx: 242, shift: 10 },
];
const START_Y = 168;

function ReactionPad({ x, y, rotate, tapAt, pad }: { x: number; y: number; rotate: number; tapAt: number[]; pad: LucideIcon[] }) {
  const loop = useLoop();
  const w = 96;
  const h = 150;
  // A tap is a quick ripple on the first button, a moment before its bubble lifts off.
  const times = [0];
  const scale = [0.6];
  const opacity = [0];
  for (const t of tapAt) {
    times.push(t, t + 0.005, t + 0.08);
    scale.push(0.6, 0.6, 1.9);
    opacity.push(0, 0.7, 0);
  }
  times.push(1);
  scale.push(0.6);
  opacity.push(0);
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <PhoneFrame x={x} y={y} w={w} h={h}>
        <rect x="10" y="24" width="20" height="20" rx="5" className="fill-muted-foreground/20" />
        <TextLine x={36} y={27} w={38} strong />
        <TextLine x={36} y={37} w={26} />
        {pad.map((icon, i) => {
          const cx = 24 + (i % 2) * 36;
          const cy = 76 + Math.floor(i / 2) * 38;
          return (
            <g key={i}>
              {i === 0 && (
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r="15"
                  className="fill-foreground/20"
                  style={ORIGIN_CENTER}
                  initial={{ scale: 0.6, opacity: 0 }}
                  {...withTimes(loop({ scale, opacity }, { ...REACTION_CYCLE, ease: "easeOut" }), times)}
                />
              )}
              <circle cx={cx} cy={cy} r="15" strokeWidth="1.5" className={i === 0 ? "fill-muted stroke-foreground/50" : "fill-card stroke-border"} />
              <Icon icon={icon} x={cx - 9} y={cy - 9} size={18} className={i === 0 && icon === Heart ? "fill-foreground text-foreground" : undefined} />
            </g>
          );
        })}
      </PhoneFrame>
    </g>
  );
}

export function LiveReactionsScene() {
  const loop = useLoop();
  // A bubble with shift s lifts off at step (STEPS - s); each phone ripples just before one of "its" bubbles.
  const liftOff = (shift: number) => (STEPS - shift) / STEPS - 0.05;
  const leftTaps = [liftOff(10), liftOff(3)];
  const rightTaps = [liftOff(5), liftOff(1)];

  return (
    <Scene label="Guests tap reactions on their phones and hearts, flames and cheers float up on the venue TV, with 24 people listening">
      <TvFrame x={70} y={22} w={340} h={210}>
        <rect x="18" y="18" width="92" height="92" rx="12" className="fill-muted-foreground/20" />
        <Icon icon={Music} x={48} y={48} size={32} className="text-muted-foreground" />
        <TextLine x={126} y={32} w={78} h={8} strong />
        <TextLine x={126} y={50} w={56} />
        <Equalizer x={126} y={70} bars={4} h={20} />

        {REACTIONS.map(({ icon, cx, shift, filled }) => {
          const t = track(shift);
          return (
            <motion.g
              key={shift}
              style={ORIGIN_CENTER}
              initial={{ y: t.y[0], opacity: t.opacity[0], scale: t.scale[0], x: t.x[0] }}
              {...loop({ y: t.y, opacity: t.opacity, scale: t.scale, x: t.x }, REACTION_CYCLE)}
            >
              <circle cx={cx} cy={START_Y} r="17" strokeWidth="1.5" className="fill-card stroke-border" />
              <Icon icon={icon} x={cx - 9} y={START_Y - 9} size={18} className={filled ? "fill-foreground text-foreground" : undefined} />
            </motion.g>
          );
        })}
      </TvFrame>

      <ReactionPad x={26} y={184} rotate={-8} tapAt={leftTaps} pad={[Heart, Flame, ThumbsUp, Sparkles]} />
      <ReactionPad x={358} y={184} rotate={8} tapAt={rightTaps} pad={[PartyPopper, Heart, Flame, ThumbsUp]} />

      <Panel x={144} y={272} w={192} h={46} r={23}>
        {[
          { cx: 24, initial: "M", tone: "muted" as const },
          { cx: 46, initial: "J", tone: "ink" as const },
          { cx: 68, initial: "K", tone: "muted" as const },
        ].map((a) => (
          <g key={a.initial}>
            <circle cx={a.cx} cy={23} r={15.5} className="fill-card" />
            <Avatar cx={a.cx} cy={23} r={13} initial={a.initial} tone={a.tone} />
          </g>
        ))}
        <LiveDot cx={96} cy={23} />
        <Label x={108} y={27.5} size={12} weight={600} tone="strong">
          24 listening
        </Label>
      </Panel>
    </Scene>
  );
}
