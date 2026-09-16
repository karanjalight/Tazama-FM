/** Display formatting shared across the Advertising pages. */

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatCompact(n: number): string {
  const rounded = Math.round(n);
  if (Math.abs(rounded) < 10_000) return rounded.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(rounded);
}

export function formatKes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-US")}`;
}

export interface Trend {
  text: string;
  direction: "up" | "down" | "flat";
}

/** "+18%" vs the previous period, or null when there's nothing to compare. */
export function trendOf(current: number, previous: number): Trend | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return { text: "New this period", direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "No change", direction: "flat" };
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs previous`, direction: pct > 0 ? "up" : "down" };
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "16:00" → "4:00 PM". */
export function formatClock(hhmm: string | null): string {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
