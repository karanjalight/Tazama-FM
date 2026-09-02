/**
 * Types + static reference data for the Create Schedule wizard. Every value
 * here that used to be a wizard-local mock list (target tree, content
 * library, genre list, song library) now comes from the real business data
 * passed down from the route (`app/business/branches/[id]/schedules/new/page.tsx`)
 * or fetched live via server actions — this file keeps only what's genuinely
 * static UI reference data (option lists, step labels).
 */
import {
  Image as ImageIcon,
  Megaphone,
  Music,
  type LucideIcon,
} from "lucide-react";

export type Priority = "low" | "normal" | "high" | "critical";
/**
 * The three independent layers a session can enable, any combination at
 * once — not a single exclusive choice. Content controls what's on screen
 * (menus, informational video, etc); Playlist is the music/background-video
 * layer, only active when explicitly enabled; Advertisement always
 * interrupts both while it plays. A session with none enabled falls back to
 * ambient background music videos (the KFC-menu-board default).
 */
export type SessionLayer = "content" | "playlist" | "advertisement";
export type AdPosition = "any" | "strategic" | "end-of-playlist" | "beginning-of-playlist";
export type RecurrenceType = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "custom";
export type Transition = "fade" | "cut" | "slide" | "dissolve";
export type ContentFit = "fill" | "fit" | "stretch";

export const SESSION_LAYERS: { id: SessionLayer; label: string; description: string; icon: LucideIcon }[] = [
  { id: "content", label: "Content", description: "Videos, images or documents that control the screen", icon: ImageIcon },
  { id: "playlist", label: "Playlist", description: "Background music and music videos", icon: Music },
  { id: "advertisement", label: "Advertisement", description: "Always interrupts content and music to play", icon: Megaphone },
];

export const PRIORITIES: { id: Priority; label: string; helper: string }[] = [
  { id: "low", label: "Low", helper: "Runs only when nothing higher-priority is scheduled." },
  { id: "normal", label: "Normal", helper: "The default priority for most schedules." },
  { id: "high", label: "High", helper: "Takes precedence over normal-priority schedules." },
  { id: "critical", label: "Critical", helper: "Overrides everything else, including other critical schedules by recency." },
];

export const WIZARD_STEPS = [
  { id: 1, label: "Basic Details", sublabel: "What you're scheduling" },
  { id: 2, label: "Target & Placement", sublabel: "Where it runs" },
  { id: 3, label: "Timing", sublabel: "Build your day" },
  { id: 4, label: "Review", sublabel: "Confirm & activate" },
] as const;

export const AD_POSITIONS: { id: AdPosition; label: string; description: string }[] = [
  { id: "any", label: "Any available position", description: "Place in the next available ad opportunity" },
  { id: "strategic", label: "Strategic placement (recommended)", description: "Tazama will place ads at optimal engagement times" },
  { id: "end-of-playlist", label: "End of playlist", description: "Play after all content in the session" },
  { id: "beginning-of-playlist", label: "Beginning of playlist", description: "Play before content starts" },
];

/** Free-text — `schedule_sessions.ad_frequency` has no check constraint. */
export const FREQUENCY_OPTIONS = [
  "Every 5 minutes",
  "Every 10 minutes",
  "Every 12 minutes",
  "Every 15 minutes",
  "Every 30 minutes",
];

/** `content_frequency_interval_minutes` IS a real integer column — so unlike
 * ad frequency, this option list carries the actual minute value. */
export const CONTENT_FREQUENCY_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 1, label: "Every minute" },
  { minutes: 5, label: "Every 5 minutes" },
  { minutes: 10, label: "Every 10 minutes" },
  { minutes: 15, label: "Every 15 minutes" },
  { minutes: 30, label: "Every 30 minutes" },
  { minutes: 60, label: "Every hour" },
];

export const RECURRENCE_OPTIONS: { id: RecurrenceType; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

export const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: "fade", label: "Fade" },
  { id: "cut", label: "Cut" },
  { id: "slide", label: "Slide" },
  { id: "dissolve", label: "Dissolve" },
];

export const FIT_OPTIONS: { id: ContentFit; label: string }[] = [
  { id: "fill", label: "Fill screen" },
  { id: "fit", label: "Fit to screen" },
  { id: "stretch", label: "Stretch" },
];

/** Common display-duration presets for a content item (Option A's "e.g. 30
 * secs, 1 min, 5 min, even hours" requirement) — the field itself accepts
 * any positive integer, these are just quick picks. */
export const DISPLAY_DURATION_PRESETS: { seconds: number; label: string }[] = [
  { seconds: 15, label: "15 sec" },
  { seconds: 30, label: "30 sec" },
  { seconds: 60, label: "1 min" },
  { seconds: 5 * 60, label: "5 min" },
  { seconds: 15 * 60, label: "15 min" },
  { seconds: 60 * 60, label: "1 hour" },
];

export function newSessionId(): string {
  return `session-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
