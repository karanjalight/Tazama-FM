/**
 * Pure gamification rules — point values, streak counting, badge thresholds.
 * No DB imports, mirrors lib/social/match-score.ts's "unit-testable without a
 * database" precedent. lib/gamification/store.ts wraps this with real queries.
 */

export const POINT_VALUES = {
  track_played: 1,
  track_shared: 2,
  shared_track_played: 5,
  streak_day_7: 10,
} as const;

export type PointEventType = keyof typeof POINT_VALUES;

/** playDaysIso: "YYYY-MM-DD" strings, any order, duplicates allowed. */
export function computeStreakDays(playDaysIso: string[]): number {
  const days = [...new Set(playDaysIso)].sort().reverse(); // lexicographic === chronological
  if (days.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = Date.parse(`${days[i - 1]}T00:00:00Z`);
    const cur = Date.parse(`${days[i]}T00:00:00Z`);
    const diffDays = Math.round((prev - cur) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

export interface BadgeStats {
  totalPlays: number;
  distinctGenres: number;
  streakDays: number;
  /** How many times something this user shared was played by someone else. */
  sharesPlayedByOthers: number;
  activeConversations: number;
  nightOwlPlays: number;
  distinctTracks: number;
}

export interface BadgeMeta {
  label: string;
  description: string;
}

export const BADGE_META: Record<string, BadgeMeta> = {
  "first-spin": { label: "First Spin", description: "Played your first track." },
  "genre-explorer": {
    label: "Genre Explorer",
    description: "Played tracks across 10+ genres.",
  },
  "on-a-roll": { label: "On a Roll", description: "A 7-day listening streak." },
  unstoppable: { label: "Unstoppable", description: "A 30-day listening streak." },
  tastemaker: {
    label: "Tastemaker",
    description: "5 of your shared tracks got played by others.",
  },
  "social-butterfly": {
    label: "Social Butterfly",
    description: "Active in 5+ conversations.",
  },
  "night-owl": { label: "Night Owl", description: "10 plays between midnight and 5am." },
  "crate-digger": { label: "Crate Digger", description: "100 unique tracks played." },
};

const BADGE_THRESHOLDS: Record<string, (s: BadgeStats) => boolean> = {
  "first-spin": (s) => s.totalPlays >= 1,
  "genre-explorer": (s) => s.distinctGenres >= 10,
  "on-a-roll": (s) => s.streakDays >= 7,
  unstoppable: (s) => s.streakDays >= 30,
  tastemaker: (s) => s.sharesPlayedByOthers >= 5,
  "social-butterfly": (s) => s.activeConversations >= 5,
  "night-owl": (s) => s.nightOwlPlays >= 10,
  "crate-digger": (s) => s.distinctTracks >= 100,
};

/** Every badge key the given stats currently qualify for (not just newly-earned ones). */
export function eligibleBadges(stats: BadgeStats): string[] {
  return Object.entries(BADGE_THRESHOLDS)
    .filter(([, check]) => check(stats))
    .map(([key]) => key);
}
