"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const METRICS = [
  { key: "plays" as const, label: "Plays", base: 24820 },
  { key: "reach" as const, label: "Reach", base: 48240 },
  { key: "revenue" as const, label: "Estimated Revenue", base: 184500 },
];

const DAYS = 29;
const WIDTH = 700;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_BOTTOM = 24;
const PAD_TOP = 12;

function seededSeries(total: number, days: number): number[] {
  const points: number[] = [];
  let seed = total;
  for (let i = 0; i < days; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const wave = 0.6 + Math.sin((i / days) * Math.PI * 1.4) * 0.5;
    const jitter = 0.85 + (seed / 233280) * 0.3;
    points.push(Math.max(0, Math.round(((total * 1.6) / days) * wave * jitter)));
  }
  return points;
}

export function AdsPerformanceChart() {
  const [metric, setMetric] = React.useState<(typeof METRICS)[number]["key"]>("plays");
  const [hovered, setHovered] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const active = METRICS.find((m) => m.key === metric)!;
  const values = React.useMemo(() => seededSeries(active.base, DAYS), [active.base]);
  const maxValue = Math.max(1, ...values) * 1.1;
  const plotWidth = WIDTH - PAD_LEFT;
  const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP;

  function xAt(i: number) {
    return PAD_LEFT + (i / (values.length - 1)) * plotWidth;
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
    setHovered(Math.min(values.length - 1, Math.max(0, Math.round(ratio * (values.length - 1)))));
  }

  function formatValue(v: number) {
    return metric === "revenue" ? `KES ${v.toLocaleString()}` : v.toLocaleString();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Advertising Performance</h2>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Chart metric">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", metric === m.key ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label={`${active.label} from Aug 1 to Aug 29, ranging up to ${formatValue(Math.round(maxValue))}`}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHovered(null)}
        >
          {[0, Math.round(maxValue / 2), Math.round(maxValue)].map((v) => (
            <g key={v}>
              <line x1={PAD_LEFT} x2={WIDTH} y1={yAt(v)} y2={yAt(v)} stroke="currentColor" strokeWidth={1} className="text-foreground/8" />
              <text x={PAD_LEFT - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[9px]">
                {metric === "revenue" ? `${Math.round(v / 1000)}k` : v.toLocaleString()}
              </text>
            </g>
          ))}

          <path d={areaPath()} fill="var(--color-violet-500)" opacity={0.12} />
          <path d={linePath()} fill="none" stroke="var(--color-violet-500)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          <text x={PAD_LEFT} y={HEIGHT - 6} className="fill-muted-foreground font-mono text-[9px]">
            Aug 1
          </text>
          <text x={WIDTH - 10} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">
            Aug 29
          </text>

          {hovered !== null && (
            <>
              <line x1={xAt(hovered)} x2={xAt(hovered)} y1={PAD_TOP} y2={yAt(0)} stroke="currentColor" strokeWidth={1} className="text-foreground/20" />
              <circle cx={xAt(hovered)} cy={yAt(values[hovered])} r={4.5} fill="var(--color-violet-500)" stroke="var(--color-card)" strokeWidth={2} />
            </>
          )}
          {values.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={xAt(i) - plotWidth / (values.length - 1) / 2}
              y={PAD_TOP}
              width={plotWidth / (values.length - 1)}
              height={plotHeight}
              fill="transparent"
              tabIndex={0}
              aria-label={`Day ${i + 1}: ${formatValue(values[i])}`}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </svg>

        {hovered !== null && (
          <div
            className={cn(
              "pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 shadow-dark",
              hovered / (values.length - 1) > 0.75 && "-translate-x-full",
              hovered / (values.length - 1) < 0.25 && "translate-x-0",
            )}
            style={{ left: `${(xAt(hovered) / WIDTH) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-muted-foreground">Aug {hovered + 1}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{formatValue(values[hovered])}</p>
          </div>
        )}
      </div>
    </div>
  );
}
