"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUp, Play, Tag, UtensilsCrossed } from "lucide-react";

import { Icon, Label, ORIGIN_CENTER, ORIGIN_LEFT, Panel, Scene, TextLine, useLoop } from "./kit";

const CARD_W = 176;
const CARD_H = 128;

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

function MediaCard({
  x,
  y,
  rotate,
  duration,
  delay,
  children,
}: {
  x: number;
  y: number;
  rotate: number;
  duration: number;
  delay: number;
  children: React.ReactNode;
}) {
  const loop = useLoop();
  return (
    <motion.g {...loop({ y: [0, -4, 0] }, { duration, delay })}>
      <g transform={`rotate(${rotate} ${x + CARD_W / 2} ${y + CARD_H / 2})`}>
        <Panel x={x} y={y} w={CARD_W} h={CARD_H}>
          {children}
        </Panel>
      </g>
    </motion.g>
  );
}

/** A landscape thumbnail, clipped to its rounded frame. */
function PhotoArt() {
  const clipId = `tour-photo-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x="10" y="10" width="156" height="76" rx="8" />
        </clipPath>
      </defs>
      <rect x="10" y="10" width="156" height="76" rx="8" className="fill-muted" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="132" cy="32" r="9" className="fill-muted-foreground/30" />
        <path d="M58 86 L112 42 L176 86 Z" className="fill-muted-foreground/20" />
        <path d="M0 86 L0 70 L46 40 L96 86 Z" className="fill-muted-foreground/35" />
      </g>
    </g>
  );
}

// One 6s upload cycle, starting on its resting frame (toast in view, bar part-filled).
const UPLOAD_CYCLE = { duration: 6, ease: "easeInOut" as const };

export function ContentScene() {
  const loop = useLoop();
  return (
    <Scene label="A content library of a video, a photo, a menu and a promo, with one item approved and a new upload arriving">
      {/* Video */}
      <MediaCard x={56} y={38} rotate={-2.5} duration={6} delay={0}>
        <rect x="10" y="10" width="156" height="76" rx="8" className="fill-muted-foreground/20" />
        <circle cx="88" cy="48" r="19" strokeWidth="1.5" className="fill-card stroke-border" />
        <Icon icon={Play} x={80} y={39} size={18} className="fill-foreground text-foreground" />
        <TextLine x={10} y={100} w={78} strong />
        <TextLine x={10} y={112} w={48} />
        <Label x={166} y={108} anchor="end" mono>
          0:30
        </Label>
      </MediaCard>

      {/* Photo */}
      <MediaCard x={248} y={38} rotate={2} duration={6.5} delay={0.7}>
        <PhotoArt />
        <TextLine x={10} y={100} w={64} strong />
        <TextLine x={10} y={112} w={92} />
      </MediaCard>

      {/* Menu */}
      <MediaCard x={56} y={182} rotate={1.5} duration={5.5} delay={1.3}>
        <Icon icon={UtensilsCrossed} x={12} y={11} size={18} className="text-muted-foreground" />
        <TextLine x={38} y={17} w={70} strong />
        <line x1="12" y1="40" x2="164" y2="40" strokeWidth="1.5" className="stroke-border" />
        {[54, 72, 90, 108].map((rowY, i) => (
          <g key={rowY}>
            <TextLine x={12} y={rowY} w={[88, 72, 96, 64][i]} />
            <TextLine x={138} y={rowY} w={26} strong />
          </g>
        ))}
      </MediaCard>

      {/* Promo */}
      <MediaCard x={248} y={182} rotate={-2} duration={7} delay={0.3}>
        <Icon icon={Tag} x={12} y={11} size={18} className="text-muted-foreground" />
        <TextLine x={38} y={17} w={58} strong />
        <line x1="12" y1="40" x2="164" y2="40" strokeWidth="1.5" className="stroke-border" />
        <Label x={12} y={86} size={40} weight={700} tone="strong">
          −20%
        </Label>
        <TextLine x={14} y={102} w={96} />
      </MediaCard>

      {/* Approved badge on the video card */}
      <motion.g
        style={ORIGIN_CENTER}
        {...withTimes(loop({ scale: [1, 1, 1.08, 1, 1] }, UPLOAD_CYCLE), [0, 0.3, 0.38, 0.46, 1])}
      >
        <g transform="translate(34 24)">
          <rect width="94" height="26" rx="13" strokeWidth="1.5" className="fill-card stroke-border" />
          <circle cx="14" cy="13" r="8" className="fill-foreground" />
          <path d="M10.5 13.2 L13 15.6 L17.6 10.6" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-background" />
          <Label x={28} y={17.5} size={11} tone="strong">
            Approved
          </Label>
        </g>
      </motion.g>

      {/* Upload toast: rises in, fills, fades away */}
      <motion.g
        initial={{ opacity: 1, y: 0 }}
        {...withTimes(
          loop({ opacity: [1, 1, 0, 0, 1, 1], y: [0, 0, -10, 18, 0, 0] }, UPLOAD_CYCLE),
          [0, 0.3, 0.42, 0.5, 0.64, 1],
        )}
      >
        <Panel x={296} y={284} w={152} h={48} r={12}>
          <rect x="8" y="8" width="32" height="32" rx="9" className="fill-muted" />
          <Icon icon={ArrowUp} x={14} y={14} size={20} />
          <TextLine x={52} y={13} w={62} strong />
          <rect x="52" y="28" width="88" height="6" rx="3" className="fill-muted-foreground/20" />
          <motion.rect
            x="52"
            y="28"
            width="88"
            height="6"
            rx="3"
            className="fill-brand"
            style={ORIGIN_LEFT}
            initial={{ scaleX: 1 }}
            {...withTimes(loop({ scaleX: [1, 1, 1, 0.08, 0.08, 1] }, UPLOAD_CYCLE), [0, 0.3, 0.42, 0.5, 0.64, 1])}
          />
        </Panel>
      </motion.g>
    </Scene>
  );
}
