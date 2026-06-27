/**
 * Deterministic cover-art seeding — same title always yields the same layout,
 * so server and client render identically (no `Math.random`, no hydration drift).
 * Covers stay black/white duotone on purpose: the page keeps a single decisive red.
 */

export function hashString(s: string): number {
  // FNV-1a (32-bit)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface CoverSeed {
  scheme: "ink" | "paper";
  /** 7 normalized bar heights (0–1) for the equalizer motif. */
  bars: number[];
  ringX: number;
  ringY: number;
  ringR: number;
}

export function coverSeed(title: string): CoverSeed {
  const h = hashString(title);
  const scheme: CoverSeed["scheme"] = h % 2 === 0 ? "ink" : "paper";
  const bars = Array.from({ length: 7 }, (_, i) => {
    const v = (hashString(`${title}#${i}`) % 1000) / 1000;
    return 0.22 + v * 0.74;
  });
  return {
    scheme,
    bars,
    ringR: 24 + (h % 14),
    ringX: 60 + ((h >> 3) % 28),
    ringY: 20 + ((h >> 6) % 16),
  };
}
