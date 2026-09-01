import { SCHEDULE_CONTENT_LIBRARY } from "../wizard-data";
import { createSession, type ScheduleState } from "../schedule-state";
import type { AssistantIntentResult } from "./assistant-types";

/**
 * Scripted "AI" responses — keyword-matched, not a real model. Each intent
 * is checked in order; the first match wins. Kept deliberately generous
 * (substring checks, not exact phrases) so the example sentences from the
 * brief — and reasonable variations of them — land on the intended script.
 * Takes the current state (not just the raw text) so intents that touch
 * `sessions` can append to the day rather than clobbering what's there.
 */
function has(text: string, ...words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

/** Heuristic only: picks up where the last session on the day ends (or 6am if the day is empty). Not a full free-slot solver. */
function nextGapStart(state: ScheduleState): string {
  if (state.sessions.length === 0) return "06:00";
  const latestEnd = state.sessions.reduce((max, s) => (s.endTime > max ? s.endTime : max), "00:00");
  return latestEnd;
}

export function matchAssistantIntent(rawText: string, state: ScheduleState): AssistantIntentResult | null {
  const text = rawText.toLowerCase();

  // --- Step 3: "I'll upload a happy hour video, a cocktail promo and our branding image." ---
  if (has(text, "happy hour") && (has(text, "cocktail") || has(text, "branding"))) {
    const picks = SCHEDULE_CONTENT_LIBRARY.filter((c) =>
      ["Happy Hour Promo", "Cocktail Special", "XYZ Restaurant Branding"].includes(c.title),
    );
    const items = picks.map((c, i) => ({ ...c, order: i }));
    const session = createSession({ label: "Happy Hour Content", startTime: "16:00", endTime: "20:00", transition: "Fade" });
    session.contentEnabled = true;
    session.selectedContent = items;
    return {
      text: "Perfect choices! Here's a preview of your content lineup — I've added it as a 4–8 PM session.",
      card: {
        kind: "content-lineup",
        totalDuration: "00:32",
        items: picks.map((c) => ({ title: c.title, duration: c.duration ?? "00:05", thumbnail: c.thumbnail })),
      },
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add an ad break", "Fill the rest of the day", "Change the time window"],
    };
  }

  // --- Step 2 (advertisement): "Show this ad in all Nairobi restaurants from 4PM to 8PM, five times per hour." ---
  if (has(text, "nairobi") && (has(text, "4pm") || has(text, "4 pm")) && (has(text, "five") || has(text, "5"))) {
    const adSession = createSession({ label: "Happy Hour Ads", startTime: "16:00", endTime: "20:00", transition: "Fade" });
    adSession.adsEnabled = true;
    adSession.adFrequency = "Every 12 minutes";
    adSession.adMaxPlaysPerDay = 20;
    return {
      text: "Got it! I've configured the targeting and started a 4–8 PM ad session for you.",
      apply: {
        locationIds: ["nairobi-cbd"],
        zoneIds: ["main-floor", "rooftop"],
        roomIds: ["main-hall", "bar-area"],
        sessions: [...state.sessions, adSession],
      },
      card: {
        kind: "target-summary",
        rows: [
          { icon: "location", label: "Locations", value: "Nairobi CBD" },
          { icon: "zone", label: "Zones", value: "Main Floor, Rooftop" },
          { icon: "room", label: "Rooms", value: "Main Hall, Bar Area" },
          { icon: "screen", label: "Screens", value: "14 screens" },
          { icon: "time", label: "Time window", value: "4:00 PM – 8:00 PM" },
          { icon: "frequency", label: "Frequency", value: "Every 12 minutes (5x per hour)" },
          { icon: "estimate", label: "Estimated plays", value: "~70 plays/day" },
        ],
        inventory: { screens: 14, playsPerDay: 70, exposures: "3,200+" },
      },
      suggestions: ["Increase frequency", "Add more locations", "Change time window"],
    };
  }

  // --- Step 3: exact-match suggestion chips ---
  if (has(text, "lunch") && has(text, "session")) {
    const session = createSession({ label: "Lunch", startTime: "12:00", endTime: "15:00", transition: "Fade" });
    return {
      text: "Added a Lunch session from 12:00 PM – 3:00 PM. Open it to choose what plays.",
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add an evening ad break", "Fill the rest of the day"],
    };
  }

  if (has(text, "evening") && has(text, "ad")) {
    const session = createSession({ label: "Evening Ads", startTime: "20:00", endTime: "22:00", transition: "Fade" });
    session.adsEnabled = true;
    return {
      text: "Added an Evening Ads session from 8:00 PM – 10:00 PM with a default frequency — adjust it any time.",
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add a lunch session", "Fill the rest of the day"],
    };
  }

  if (has(text, "fill") && has(text, "day")) {
    const start = nextGapStart(state);
    if (start >= "23:59") {
      return { text: "Your day already looks fully scheduled!", suggestions: [] };
    }
    const session = createSession({ label: "General Rotation", startTime: start, endTime: "23:59", transition: "Fade" });
    return {
      text: `Added a General Rotation session from ${start} to fill out the rest of the day. Open it to pick what plays.`,
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add a lunch session", "Add an evening ad break"],
    };
  }

  // --- Generic scripted intents from the brief ---
  if (has(text, "happy hour")) {
    return {
      text: "Great. I'll help you set up a happy hour schedule.",
      apply: { name: "Happy Hour Promotion", description: "Promotional content for happy hour." },
      suggestions: ["Target all screens", "Use main hall", "Select rooftop"],
    };
  }

  if (has(text, "weekday") && (has(text, "9 am") || has(text, "9am") || has(text, "9:00"))) {
    return {
      text: "I've set the recurrence to weekdays.",
      apply: { recurrence: "weekdays" },
      suggestions: ["Every day", "This weekend", "Custom time"],
    };
  }

  if (has(text, "all screens")) {
    return {
      text: "All 24 screens at Nairobi CBD are selected.",
      apply: {
        locationIds: ["nairobi-cbd"],
        zoneIds: ["main-floor", "rooftop"],
        roomIds: ["main-hall", "bar-area", "vip-lounge", "private-dining-1", "rooftop-lounge", "rooftop-bar"],
        screenMode: "all",
      },
      suggestions: ["Main Hall", "Bar Area", "Nairobi CBD"],
    };
  }

  if (has(text, "morning") && (has(text, "playlist") || has(text, "announcement"))) {
    return {
      text: "Sounds good — I'll set this up as a morning playlist schedule.",
      apply: { name: "Morning Playlist", description: "Background playlist for the morning shift." },
      suggestions: ["Add a morning session", "Every day", "Weekdays"],
    };
  }

  if (has(text, "weekend")) {
    return {
      text: "I've set this to run on weekends.",
      apply: { recurrence: "weekends" },
      suggestions: ["Every day", "Weekdays", "Custom time"],
    };
  }

  if (has(text, "browse") && has(text, "library")) {
    return {
      text: "Open any session and browse the content library from there — pick anything to add to that session.",
      suggestions: ["Add a lunch session", "Fill the rest of the day"],
    };
  }

  return null;
}
