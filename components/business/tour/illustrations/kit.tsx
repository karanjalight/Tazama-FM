"use client";

/**
 * Drawing kit for the onboarding tour's illustrations. Every scene is a 480×360
 * SVG composed from these primitives so the set reads as one family:
 * token colours only (fill-card, fill-muted, stroke-border, fill-foreground,
 * fill-muted-foreground), brand red reserved for "live" indicators, no
 * gradients (docs/DESIGN_SYSTEM.md), slow loops that stand still under
 * prefers-reduced-motion. Design each scene so its resting frame reads well.
 */
import * as React from "react";
import { motion, type Easing, type TargetAndTransition } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export const SCENE_W = 480;
export const SCENE_H = 360;

/** SVG elements scale/rotate around (0,0) unless told otherwise. */
export const ORIGIN_CENTER: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
export const ORIGIN_BOTTOM: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "bottom" };
export const ORIGIN_LEFT: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "left" };

export interface LoopOptions {
  duration?: number;
  delay?: number;
  repeatDelay?: number;
  ease?: Easing | Easing[];
}

/**
 * `loop(keyframes, options)` → motion props for an endless loop, or `{}`
 * under reduced motion (the element rests at its static attributes/`initial`).
 */
export function useLoop() {
  const reduced = usePrefersReducedMotion();
  return React.useCallback(
    (animate: TargetAndTransition, { duration = 4, delay = 0, repeatDelay = 0, ease = "easeInOut" }: LoopOptions = {}) =>
      reduced ? {} : { animate, transition: { duration, delay, repeatDelay, ease, repeat: Infinity } },
    [reduced],
  );
}

export function Scene({ label, children }: { label: string; children: React.ReactNode }) {
  const patternId = `tour-dots-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} role="img" aria-label={label} className="h-full w-full">
      <defs>
        <pattern id={patternId} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" className="fill-foreground/10" />
        </pattern>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} rx="20" fill={`url(#${patternId})`} />
      {children}
    </svg>
  );
}

/** A card surface with a soft offset shadow. Children use panel-local coordinates. */
export function Panel({
  x,
  y,
  w,
  h,
  r = 14,
  className,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="5" width={w} height={h} rx={r} className="fill-foreground/5" />
      <rect width={w} height={h} rx={r} strokeWidth="1.5" className={cn("fill-card stroke-border", className)} />
      {children}
    </g>
  );
}

/** Placeholder text: a rounded bar. `strong` for titles. */
export function TextLine({ x, y, w, h = 6, strong = false }: { x: number; y: number; w: number; h?: number; strong?: boolean }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={h / 2} className={strong ? "fill-foreground/75" : "fill-muted-foreground/30"} />
  );
}

/** Real text — use sparingly (numbers, short chips). */
export function Label({
  x,
  y,
  children,
  size = 11,
  weight = 500,
  tone = "muted",
  anchor = "start",
  mono = false,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  weight?: number;
  tone?: "muted" | "strong" | "brand" | "inverse";
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
}) {
  const toneClass = {
    muted: "fill-muted-foreground",
    strong: "fill-foreground",
    brand: "fill-brand",
    inverse: "fill-background",
  }[tone];
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} textAnchor={anchor} className={cn(toneClass, mono && "font-mono")}>
      {children}
    </text>
  );
}

/** A wall TV. Children draw in screen-local coordinates: (0,0) → (w-16, h-16). */
export function TvFrame({
  x,
  y,
  w,
  h,
  stand = true,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  stand?: boolean;
  children?: React.ReactNode;
}) {
  const sw = w - 16;
  const sh = h - 16;
  return (
    <g transform={`translate(${x} ${y})`}>
      {stand && (
        <>
          <rect x={w / 2 - 3} y={h} width="6" height="9" className="fill-muted-foreground/30" />
          <rect x={w / 2 - 28} y={h + 8} width="56" height="5" rx="2.5" className="fill-muted-foreground/30" />
        </>
      )}
      <rect y="5" width={w} height={h} rx="14" className="fill-foreground/5" />
      <rect width={w} height={h} rx="14" strokeWidth="1.5" className="fill-card stroke-border" />
      <svg x="8" y="8" width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`} overflow="hidden">
        <rect width={sw} height={sh} rx="8" className="fill-muted" />
        {children}
      </svg>
    </g>
  );
}

/** A phone. Children draw in screen-local coordinates: (0,0) → (w-12, h-12). */
export function PhoneFrame({
  x,
  y,
  w = 92,
  h = 176,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
}) {
  const sw = w - 12;
  const sh = h - 12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="5" width={w} height={h} rx="20" className="fill-foreground/5" />
      <rect width={w} height={h} rx="20" strokeWidth="1.5" className="fill-card stroke-border" />
      <svg x="6" y="6" width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`} overflow="hidden">
        <rect width={sw} height={sh} rx="15" className="fill-background" />
        {children}
      </svg>
      <rect x={w / 2 - 13} y="11" width="26" height="6" rx="3" className="fill-foreground/80" />
    </g>
  );
}

export function Speaker({ x, y, w = 44, h = 64 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="4" width={w} height={h} rx="10" className="fill-foreground/5" />
      <rect width={w} height={h} rx="10" strokeWidth="1.5" className="fill-card stroke-border" />
      <circle cx={w / 2} cy={h * 0.28} r={w * 0.13} strokeWidth="1.5" className="fill-muted stroke-border" />
      <circle cx={w / 2} cy={h * 0.66} r={w * 0.27} strokeWidth="1.5" className="fill-muted stroke-border" />
      <circle cx={w / 2} cy={h * 0.66} r={w * 0.09} className="fill-muted-foreground/40" />
    </g>
  );
}

/** A pill label. Width is estimated from the label unless `w` is given. */
export function Chip({
  x,
  y,
  label,
  w,
  tone = "default",
  dot = false,
}: {
  x: number;
  y: number;
  label: string;
  w?: number;
  tone?: "default" | "ink";
  dot?: boolean;
}) {
  const width = w ?? Math.round(label.length * 6 + (dot ? 32 : 22));
  const ink = tone === "ink";
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height="22" rx="11" strokeWidth="1.5" className={ink ? "fill-foreground stroke-foreground" : "fill-card stroke-border"} />
      {dot && <circle cx="12" cy="11" r="3.5" className="fill-brand" />}
      <text
        x={dot ? 21 : width / 2}
        y="15"
        fontSize="10.5"
        fontWeight="500"
        textAnchor={dot ? "start" : "middle"}
        className={ink ? "fill-background" : "fill-foreground"}
      >
        {label}
      </text>
    </g>
  );
}

export function Avatar({
  cx,
  cy,
  r = 14,
  initial,
  tone = "muted",
}: {
  cx: number;
  cy: number;
  r?: number;
  initial?: string;
  tone?: "muted" | "ink" | "brand";
}) {
  const fill = { muted: "fill-muted stroke-border", ink: "fill-foreground stroke-foreground", brand: "fill-brand stroke-brand" }[tone];
  const text = { muted: "fill-foreground", ink: "fill-background", brand: "fill-white" }[tone];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} strokeWidth="1.5" className={fill} />
      {initial && (
        <text x={cx} y={cy + r * 0.36} fontSize={r} fontWeight="600" textAnchor="middle" className={text}>
          {initial}
        </text>
      )}
    </g>
  );
}

/** Brand "live" dot with a slow halo. */
export function LiveDot({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  const loop = useLoop();
  return (
    <g>
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        className="fill-brand/35"
        style={ORIGIN_CENTER}
        {...loop({ scale: [1, 2.8], opacity: [0.7, 0] }, { duration: 1.8, ease: "easeOut" })}
      />
      <circle cx={cx} cy={cy} r={r} className="fill-brand" />
    </g>
  );
}

const EQ_REST = [0.55, 1, 0.4, 0.8, 0.65];

/** Brand equalizer bars — the "something is playing" signal. */
export function Equalizer({ x, y, bars = 4, h = 16, barW = 3, gap = 2.5 }: { x: number; y: number; bars?: number; h?: number; barW?: number; gap?: number }) {
  const loop = useLoop();
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: bars }, (_, i) => (
        <motion.rect
          key={i}
          x={i * (barW + gap)}
          y="0"
          width={barW}
          height={h}
          rx={barW / 2}
          className="fill-brand"
          style={ORIGIN_BOTTOM}
          initial={{ scaleY: EQ_REST[i % EQ_REST.length] }}
          {...loop({ scaleY: [0.35, 1, 0.5, 0.85, 0.35] }, { duration: 1.1 + i * 0.17, delay: i * 0.08 })}
        />
      ))}
    </g>
  );
}

/** Vertical-bar audio waveform. */
export function Waveform({
  x,
  y,
  w,
  h,
  bars = 24,
  className = "fill-foreground/70",
  animated = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  bars?: number;
  className?: string;
  animated?: boolean;
}) {
  const loop = useLoop();
  const step = w / bars;
  const barW = Math.max(2, step * 0.55);
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: bars }, (_, i) => {
        // Rounded: the browser normalises long floats in the SSR'd transform, which breaks hydration.
        const rest = Math.round((0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.35))) * 1000) / 1000;
        return (
          <motion.rect
            key={i}
            x={i * step}
            y="0"
            width={barW}
            height={h}
            rx={barW / 2}
            className={className}
            style={ORIGIN_CENTER}
            initial={{ scaleY: rest }}
            {...(animated
              ? loop({ scaleY: [rest, Math.min(1, rest + 0.35), rest * 0.6, rest] }, { duration: 1.4 + (i % 5) * 0.12, delay: i * 0.03 })
              : {})}
          />
        );
      })}
    </g>
  );
}

/** Dashed connector whose dashes flow along the path. Draw these first (underneath). */
export function FlowLine({ d, delay = 0 }: { d: string; delay?: number }) {
  const loop = useLoop();
  return (
    <motion.path
      d={d}
      fill="none"
      strokeWidth="1.5"
      strokeDasharray="4 5"
      strokeLinecap="round"
      className="stroke-muted-foreground/45"
      {...loop({ strokeDashoffset: [18, 0] }, { duration: 1.2, ease: "linear", delay })}
    />
  );
}

/** A mouse pointer, tip at (x, y). */
export function Pointer({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 0 L0 17 L4.5 13 L7.5 20 L10.5 18.8 L7.5 12 L13 12 Z"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="fill-foreground stroke-card"
    />
  );
}

/** A lucide icon placed inside the SVG (lucide renders a nested <svg>). Colour via text-* classes. */
export function Icon({ icon: IconComponent, x, y, size = 16, className }: { icon: LucideIcon; x: number; y: number; size?: number; className?: string }) {
  return <IconComponent x={x} y={y} width={size} height={size} strokeWidth={1.75} className={cn("text-foreground", className)} />;
}
