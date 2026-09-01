"use client";

import * as React from "react";

import type { WeeklyPoint } from "../data-engine";
import { cn } from "@/lib/utils";

const METRICS = [
  { key: "audience" as const, label: "Audience" },
  { key: "plays" as const, label: "Plays" },
  { key: "engagement" as const, label: "Engagement" },
];

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_BOTTOM = 24;
const PAD_TOP = 12;

export function PerformanceChart({ series }: { series: WeeklyPoint[] }) {
  const [metric, setMetric] = React.useState<(typeof METRICS)[number]["key"]>("audience");
  const [hovered, setHovered] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const values = series.map((p) => p[metric]);
  const maxValue = Math.max(1, ...values) * 1.15;
  const plotWidth = WIDTH - PAD_LEFT;
  const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP;

  function xAt(i: number) {
    return PAD_LEFT + (i / (series.length - 1)) * plotWidth;
  }
  function yAt(v: number) {
    return PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
  }
  function linePath() {
    return values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  }
  function areaPath() {
    return `${linePath()} L${xAt(values.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;
  }

  function handleMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PAD_LEFT) / plotWidth;
    const idx = Math.round(ratio * (series.length - 1));
    setHovered(Math.min(series.length - 1, Math.max(0, idx)));
  }

  const peakIdx = values.indexOf(Math.max(...values));
  const summary = `${METRICS.find((m) => m.key === metric)?.label} peaked on ${series[peakIdx]?.label} at ${values[peakIdx]?.toLocaleString()}.`;
  const gridValues = [0, Math.round(maxValue / 2), Math.round(maxValue)];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Audience &amp; Content Activity</h2>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Chart metric">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                metric === m.key ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        {summary}
      </span>

      <div className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label={summary}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHovered(null)}
        >
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={PAD_LEFT} x2={WIDTH} y1={yAt(v)} y2={yAt(v)} stroke="currentColor" strokeWidth={1} className="text-foreground/8" />
              <text x={PAD_LEFT - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[9px]">
                {v.toLocaleString()}
              </text>
            </g>
          ))}

          <path d={areaPath()} fill="var(--color-violet-500)" opacity={0.12} />
          <path d={linePath()} fill="none" stroke="var(--color-violet-500)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {series.map((p, i) => (
            <text key={p.label} x={xAt(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
              {p.label}
            </text>
          ))}

          {hovered !== null && (
            <>
              <line x1={xAt(hovered)} x2={xAt(hovered)} y1={PAD_TOP} y2={yAt(0)} stroke="currentColor" strokeWidth={1} className="text-foreground/20" />
              <circle cx={xAt(hovered)} cy={yAt(values[hovered])} r={4.5} fill="var(--color-violet-500)" stroke="var(--color-card)" strokeWidth={2} />
            </>
          )}

          {series.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={xAt(i) - plotWidth / (series.length - 1) / 2}
              y={PAD_TOP}
              width={plotWidth / (series.length - 1)}
              height={plotHeight}
              fill="transparent"
              tabIndex={0}
              aria-label={`${series[i].label}: ${values[i].toLocaleString()}`}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </svg>

        {hovered !== null && (
          <div
            className={cn(
              "pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 shadow-dark",
              hovered / (series.length - 1) > 0.75 && "-translate-x-full",
              hovered / (series.length - 1) < 0.25 && "translate-x-0",
            )}
            style={{ left: `${(xAt(hovered) / WIDTH) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-muted-foreground">{series[hovered].label}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{values[hovered].toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
