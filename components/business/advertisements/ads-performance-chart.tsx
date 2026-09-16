"use client";

import * as React from "react";

import type { AdDailyPoint } from "@/lib/business/ad-analytics";
import { formatCompact, formatCount, formatKes, formatShortDate } from "./format";
import { cn } from "@/lib/utils";

const METRICS = [
  { key: "plays", label: "Plays" },
  { key: "views", label: "Est. Views" },
  { key: "reach", label: "Est. Reach" },
  { key: "revenue", label: "Est. Revenue" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

/** Drawn in real pixels: the viewBox width tracks the container (see the
 * ResizeObserver below), so text and stroke sizes never scale with the page. */
const DEFAULT_WIDTH = 700;
const HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_BOTTOM = 24;
const PAD_TOP = 12;

export function AdsPerformanceChart({
  daily,
  title = "Advertising Performance",
  className,
}: {
  daily: AdDailyPoint[];
  title?: string;
  className?: string;
}) {
  const [metric, setMetric] = React.useState<MetricKey>("plays");
  const [hovered, setHovered] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [WIDTH, setWidth] = React.useState(DEFAULT_WIDTH);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const active = METRICS.find((m) => m.key === metric)!;
  const values = daily.map((d) => d[metric]);
  const total = values.reduce((a, b) => a + b, 0);
  const maxValue = Math.max(1, ...values) * 1.1;
  const plotWidth = WIDTH - PAD_LEFT;
  const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP;
  const steps = Math.max(1, values.length - 1);

  const xAt = (i: number) => (values.length === 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / steps) * plotWidth);
  const yAt = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const areaPath = values.length ? `${linePath} L${xAt(values.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z` : "";

  const format = (v: number) => (metric === "revenue" ? formatKes(v) : formatCount(v));
  const axis = (v: number) => (metric === "revenue" ? `${formatCompact(v)}` : formatCompact(v));

  function handleMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !values.length) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    setHovered(Math.min(values.length - 1, Math.max(0, Math.round(((x - PAD_LEFT) / plotWidth) * steps))));
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {format(total)} {active.label.toLowerCase().replace("est. ", "estimated ")} ·{" "}
            {daily.length ? `${formatShortDate(daily[0].date)} – ${formatShortDate(daily[daily.length - 1].date)}` : "—"}
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Chart metric">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                metric === m.key ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-4">
        {total === 0 && (
          <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-sm text-muted-foreground">
            No ad plays in this period yet.
          </p>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full touch-none"
          role="img"
          aria-label={`${active.label} per day, total ${format(total)}`}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHovered(null)}
        >
          {[0, maxValue / 2, maxValue].map((v, i) => (
            <g key={i}>
              <line x1={PAD_LEFT} x2={WIDTH} y1={yAt(v)} y2={yAt(v)} stroke="currentColor" strokeWidth={1} className="text-foreground/8" />
              {total > 0 && (
                <text x={PAD_LEFT - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[10px]">
                  {axis(v)}
                </text>
              )}
            </g>
          ))}

          {values.length > 0 && total > 0 && (
            <>
              <path d={areaPath} fill="var(--color-violet-500)" opacity={0.12} />
              <path d={linePath} fill="none" stroke="var(--color-violet-500)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

          {daily.length > 0 && (
            <>
              <text x={PAD_LEFT} y={HEIGHT - 6} className="fill-muted-foreground font-mono text-[10px]">
                {formatShortDate(daily[0].date)}
              </text>
              <text x={WIDTH - 4} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
                {formatShortDate(daily[daily.length - 1].date)}
              </text>
            </>
          )}

          {hovered !== null && values[hovered] !== undefined && (
            <>
              <line x1={xAt(hovered)} x2={xAt(hovered)} y1={PAD_TOP} y2={yAt(0)} stroke="currentColor" strokeWidth={1} className="text-foreground/20" />
              <circle cx={xAt(hovered)} cy={yAt(values[hovered])} r={4.5} fill="var(--color-violet-500)" stroke="var(--color-card)" strokeWidth={2} />
            </>
          )}
          {values.map((v, i) => (
            <rect
              key={daily[i].date}
              x={xAt(i) - plotWidth / steps / 2}
              y={PAD_TOP}
              width={plotWidth / steps}
              height={plotHeight}
              fill="transparent"
              tabIndex={0}
              aria-label={`${formatShortDate(daily[i].date)}: ${format(v)}`}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </svg>

        {hovered !== null && daily[hovered] && (
          <div
            className={cn(
              "pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 shadow-dark",
              steps > 0 && hovered / steps > 0.75 && "-translate-x-full",
              steps > 0 && hovered / steps < 0.25 && "translate-x-0",
            )}
            style={{ left: `${(xAt(hovered) / WIDTH) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-muted-foreground">{formatShortDate(daily[hovered].date)}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{format(values[hovered])}</p>
            {metric !== "plays" && <p className="text-[10px] text-muted-foreground">{formatCount(daily[hovered].plays)} plays</p>}
          </div>
        )}
      </div>
    </div>
  );
}
