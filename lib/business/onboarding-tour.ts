/**
 * Pure rules for the Tazama Business onboarding tour — no React, no Supabase,
 * relative imports only, so it compiles standalone for `node --test`.
 * Progress is stored per person in Supabase auth `user_metadata[TOUR_META_KEY]`.
 */

/** Bump to show the tour to everyone again (e.g. after a big launch). */
export const TOUR_VERSION = 1;

export const TOUR_META_KEY = "business_tour";

/** `data-tour` ids carried by sidebar nav rows (see business-nav-items.ts). */
export const TOUR_TARGET_IDS = [
  "overview",
  "locations",
  "rooms-zones",
  "screens-devices",
  "audio-zones",
  "content-library",
  "playlists",
  "schedules",
  "announcements",
  "analytics",
  "audience",
  "reports",
  "advertisements",
  "campaigns",
  "ad-library",
  "ad-inventory",
  "ad-performance",
  "team",
  "billing",
  "integrations",
  "business-settings",
] as const;
export type TourTargetId = (typeof TOUR_TARGET_IDS)[number];

export type TourRole = "owner" | "admin" | "manager";

export type TourChapter = "welcome" | "setup" | "play" | "engage" | "measure" | "grow" | "finish";

/** Content chapters, in tour order — the progress rail and the Help menu's jump list. */
export const JUMPABLE_CHAPTERS = ["setup", "play", "engage", "measure", "grow"] as const;
export type JumpableChapter = (typeof JUMPABLE_CHAPTERS)[number];

export const CHAPTER_LABEL: Record<TourChapter, string> = {
  welcome: "Welcome",
  setup: "Set up",
  play: "Play",
  engage: "Engage",
  measure: "Measure",
  grow: "Grow",
  finish: "Finish",
};

export const TOUR_ILLUSTRATION_KEYS = [
  "welcome",
  "overview",
  "locations",
  "rooms-zones",
  "screens",
  "audio-zones",
  "content",
  "playlists",
  "schedules",
  "announcements",
  "guest-requests",
  "live-reactions",
  "analytics",
  "reports",
  "advertising",
  "team",
  "finish",
] as const;
export type TourIllustrationKey = (typeof TOUR_ILLUSTRATION_KEYS)[number];

export interface TourStep {
  id: string;
  chapter: TourChapter;
  title: string;
  body: string;
  /** Replaces `body` for managers (who have no checklist or team page). */
  managerBody?: string;
  /** A short practical aside shown under the body. */
  tip?: string;
  /** Where this lives, e.g. ["Manage", "Locations"]. */
  where?: string[];
  /** Sidebar rows to spotlight; their union rectangle is highlighted. */
  targets: TourTargetId[];
  illustration: TourIllustrationKey;
  /** Omit for every role. */
  roles?: TourRole[];
}

export type TourStatus = "completed" | "skipped";

export interface TourMeta {
  version: number;
  status: TourStatus;
  at: string;
}

export const TOUR_SOURCES = ["auto", "help", "checklist"] as const;
export type TourSource = (typeof TOUR_SOURCES)[number];

export const TOUR_EVENT_NAMES = ["started", "step_viewed", "skipped", "completed"] as const;
export type TourEventName = (typeof TOUR_EVENT_NAMES)[number];

export interface TourEventPayload {
  event: TourEventName;
  source: TourSource;
  stepId: string;
  stepIndex: number;
  totalSteps: number;
}

export function parseTourMeta(raw: unknown): TourMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "number" || !Number.isFinite(r.version)) return null;
  if (r.status !== "completed" && r.status !== "skipped") return null;
  if (typeof r.at !== "string") return null;
  return { version: r.version, status: r.status, at: r.at };
}

export function stepsForRole(steps: readonly TourStep[], role: TourRole): TourStep[] {
  return steps
    .filter((s) => !s.roles || s.roles.includes(role))
    .map((s) => (role === "manager" && s.managerBody ? { ...s, body: s.managerBody } : s));
}

export function chapterStartIndex(steps: readonly TourStep[], chapter: TourChapter): number {
  const index = steps.findIndex((s) => s.chapter === chapter);
  return index === -1 ? 0 : index;
}

export interface ChapterSegment {
  chapter: JumpableChapter;
  label: string;
  state: "done" | "current" | "upcoming";
}

export function chapterSegments(steps: readonly TourStep[], index: number): ChapterSegment[] {
  const current = steps[index]?.chapter;
  return JUMPABLE_CHAPTERS.filter((c) => steps.some((s) => s.chapter === c)).map((chapter) => {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.chapter === chapter) last = i;
    });
    const state = chapter === current ? "current" : index > last ? "done" : "upcoming";
    return { chapter, label: CHAPTER_LABEL[chapter], state };
  });
}

/** The tour opens by itself only on the Overview, and only until this version is handled. */
export function shouldAutoLaunch({ meta, pathname }: { meta: TourMeta | null; pathname: string }): boolean {
  if (pathname !== "/business/dashboard") return false;
  return !meta || meta.version < TOUR_VERSION;
}

/**
 * Metadata to store when a tour closes, or `null` when nothing should change —
 * a skipped replay must never downgrade an earlier completion of this version.
 */
export function nextTourMeta(prev: TourMeta | null, status: TourStatus, nowIso: string): TourMeta | null {
  if (prev && prev.version >= TOUR_VERSION && (prev.status === "completed" || status === "skipped")) {
    return null;
  }
  return { version: TOUR_VERSION, status, at: nowIso };
}
