"use client";

import * as React from "react";

import { MOCK_ENGAGEMENT_SERIES } from "./mock-data";
import { cn } from "@/lib/utils";

const WIDTH = 600;
const HEIGHT = 200;
const PAD_LEFT = 32;
const PAD_BOTTOM = 24;
const PAD_TOP = 8;

const { hours, series } = MOCK_ENGAGEMENT_SERIES;
const plotWidth = WIDTH - PAD_LEFT;
const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP;
const maxValue = 100;

function xAt(i: number) {
  return PAD_LEFT + (i / (hours.length - 1)) * plotWidth;
}
function yAt(v: number) {
  return PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
}

function linePath(points: number[]) {
  return points.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
}
function areaPath(points: number[]) {
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  return `${line} L${xAt(points.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;
}

export function EngagementChart() {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PAD_LEFT) / plotWidth;
    const idx = Math.round(ratio * (hours.length - 1));
    setHovered(Math.min(hours.length - 1, Math.max(0, idx)));
  };

  const gridValues = [0, 50, 100];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label="Engagement overview over the last 24 hours"
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHovered(null)}
        >
          {gridValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="currentColor"
                strokeWidth={1}
                className="text-foreground/8"
              />
              <text
                x={PAD_LEFT - 8}
                y={yAt(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground font-mono text-[9px]"
              >
                {v}
              </text>
            </g>
          ))}

          {series.map((s) => (
            <path key={`${s.key}-area`} d={areaPath(s.points)} fill={s.color} opacity={0.1} />
          ))}
          {series.map((s) => (
            <path
              key={`${s.key}-line`}
              d={linePath(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {hours.map((h, i) => (
            <text
              key={h}
              x={xAt(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[9px]"
            >
              {h}
            </text>
          ))}

          {hovered !== null && (
            <>
              <line
                x1={xAt(hovered)}
                x2={xAt(hovered)}
                y1={PAD_TOP}
                y2={yAt(0)}
                stroke="currentColor"
                strokeWidth={1}
                className="text-foreground/20"
              />
              {series.map((s) => (
                <circle
                  key={`${s.key}-dot`}
                  cx={xAt(hovered)}
                  cy={yAt(s.points[hovered])}
                  r={4}
                  fill={s.color}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                />
              ))}
            </>
          )}

          {hours.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={xAt(i) - plotWidth / (hours.length - 1) / 2}
              y={PAD_TOP}
              width={plotWidth / (hours.length - 1)}
              height={plotHeight}
              fill="transparent"
              tabIndex={0}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </svg>

        {hovered !== null && (
          <div
            className={cn(
              "pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 shadow-dark",
              hovered / (hours.length - 1) > 0.75 && "-translate-x-full",
              hovered / (hours.length - 1) < 0.25 && "translate-x-0",
            )}
            style={{ left: `${(xAt(hovered) / WIDTH) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-muted-foreground">{hours[hovered]}</p>
            <div className="mt-1 space-y-0.5">
              {series.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-0.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {s.points[hovered]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
