/**
 * Pure, dependency-free planner for room suggestions. Decides WHICH genres get
 * HOW MANY slots in the "Up Next" pool — the room's genres anchor it, with a
 * small, capped nudge from members whose taste is in an adjacent family.
 *
 * No app imports on purpose: this is the unit-tested heart of the engine
 * (`lib/rooms/suggestions.ts` wraps it with seeding + track fetching).
 */

export interface PlanInput {
  /** Room tag slugs (the host's preset) — the universe of the playlist. */
  roomGenres: string[];
  /** Flat list of present members' genre slugs, WITH repeats (for true counts). */
  participantGenres: string[];
  /** Adjacency family for a slug (undefined → not adjacency-eligible). */
  familyOf: (value: string) => string | undefined;
  /** Target pool size. */
  limit: number;
  /** Share of the pool reserved for room genres (0..1). Default 0.8. */
  anchorShare?: number;
}

export interface GenrePlan {
  value: string;
  slots: number;
  kind: "room" | "adjacent";
}

interface WeightedItem {
  value: string;
  weight: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Integer slot allocation by weight (largest-remainder), every item getting at
 * least one slot. If `total` is smaller than the item count, only the top
 * `total` items (by weight, stable) get a single slot each. Always sums to
 * `total`.
 */
function distribute(total: number, items: WeightedItem[]): Map<string, number> {
  const out = new Map<string, number>();
  if (total <= 0 || items.length === 0) return out;

  const sorted = items
    .map((it, i) => ({ ...it, i }))
    .sort((a, b) => b.weight - a.weight || a.i - b.i);

  if (total < sorted.length) {
    for (let k = 0; k < total; k++) out.set(sorted[k].value, 1);
    return out;
  }

  for (const it of sorted) out.set(it.value, 1);
  const remaining = total - sorted.length;
  if (remaining <= 0) return out;

  const sumW = sorted.reduce((s, it) => s + it.weight, 0) || sorted.length;
  const quotas = sorted.map((it) => {
    const ideal = (remaining * it.weight) / sumW;
    const floor = Math.floor(ideal);
    return { value: it.value, i: it.i, floor, frac: ideal - floor };
  });

  let assigned = 0;
  for (const q of quotas) {
    out.set(q.value, (out.get(q.value) ?? 0) + q.floor);
    assigned += q.floor;
  }

  let leftover = remaining - assigned;
  const byFrac = [...quotas].sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < byFrac.length && leftover > 0; k++) {
    out.set(byFrac[k].value, (out.get(byFrac[k].value) ?? 0) + 1);
    leftover--;
  }
  return out;
}

/**
 * Plan the genre mix for a room. Returns the per-genre slot counts; the caller
 * fetches `slots` popular tracks for each and interleaves (room first).
 */
export function planSuggestions(input: PlanInput): GenrePlan[] {
  const limit = Math.max(0, Math.floor(input.limit));
  if (limit === 0) return [];
  const anchorShare = clamp(input.anchorShare ?? 0.8, 0, 1);

  const counts = new Map<string, number>();
  for (const g of input.participantGenres) {
    if (!g) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }

  // Room set: preserve pick order, dedupe, drop the "anything goes" sentinel.
  const inRoom = new Set<string>();
  let roomSet: string[] = [];
  for (const g of input.roomGenres) {
    if (!g || g === "play-anything" || inRoom.has(g)) continue;
    inRoom.add(g);
    roomSet.push(g);
  }

  // No room preset → fall back to the crowd's top tastes (no adjacency layer).
  let fallback = false;
  if (roomSet.length === 0) {
    fallback = true;
    roomSet = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);
    if (roomSet.length === 0) return [];
  }

  const roomItems: WeightedItem[] = roomSet.map((g) => ({
    value: g,
    weight: 1 + (counts.get(g) ?? 0),
  }));

  // Adjacency: present members whose genre shares a family with a room genre.
  const roomFamilies = new Set<string>();
  for (const g of roomSet) {
    const f = input.familyOf(g);
    if (f) roomFamilies.add(f);
  }
  const adjItems: WeightedItem[] = [];
  if (!fallback) {
    for (const [g, c] of counts) {
      if (inRoom.has(g) || c <= 0) continue;
      const f = input.familyOf(g);
      if (f && roomFamilies.has(f)) adjItems.push({ value: g, weight: c });
    }
  }

  // Split slots: adjacency only when there are candidates.
  let adjSlots = adjItems.length > 0 ? Math.round(limit * (1 - anchorShare)) : 0;
  let anchorSlots = limit - adjSlots;
  if (anchorSlots < roomSet.length) {
    anchorSlots = Math.min(limit, roomSet.length);
    adjSlots = limit - anchorSlots;
  }

  const roomAlloc = distribute(anchorSlots, roomItems);
  const adjAlloc =
    adjSlots > 0 ? distribute(adjSlots, adjItems) : new Map<string, number>();

  const out: GenrePlan[] = [];
  for (const it of roomItems) {
    const s = roomAlloc.get(it.value) ?? 0;
    if (s > 0) out.push({ value: it.value, slots: s, kind: "room" });
  }
  for (const it of adjItems) {
    const s = adjAlloc.get(it.value) ?? 0;
    if (s > 0) out.push({ value: it.value, slots: s, kind: "adjacent" });
  }
  return out;
}
