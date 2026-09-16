import { cn } from "@/lib/utils";

const SIZE = 25;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inFinder(x: number, y: number) {
  const corners = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];
  return corners.some(([cx, cy]) => x >= cx - 1 && x <= cx + 7 && y >= cy - 1 && y <= cy + 7);
}

/** Module grid computed once per seed — deterministic, so SSR and client agree. */
const cache = new Map<number, string>();
function modulesPath(seed: number) {
  const hit = cache.get(seed);
  if (hit) return hit;
  const rand = mulberry32(seed);
  let d = "";
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (inFinder(x, y)) continue;
      const timing = (x === 6 || y === 6) && (x + y) % 2 === 0;
      if (timing || rand() > 0.52) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  cache.set(seed, d);
  return d;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path d={`M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z`} fillRule="evenodd" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </>
  );
}

/** A QR-code-shaped mark for mockups. Decorative — it doesn't encode a URL. */
export function QrMark({ seed = 7, className }: { seed?: number; className?: string }) {
  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={cn("fill-current", className)}
    >
      <path d={modulesPath(seed)} />
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
    </svg>
  );
}
