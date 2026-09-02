import { createSession, type ScheduleState } from "../schedule-state";
import type { AssistantIntentResult } from "./assistant-types";

/**
 * Scripted "AI" responses — keyword-matched, not a real model; explicitly
 * out of scope for the Schedules real-backend rebuild (only the data it
 * patches had to become real). Each intent is checked in order; the first
 * match wins. Kept deliberately generous (substring checks, not exact
 * phrases) so the example sentences from the brief — and reasonable
 * variations of them — land on the intended script.
 *
 * Deliberately doesn't try to pick real target locations/zones/rooms or
 * real content items — a keyword matcher has no way to know which of the
 * business's actual rooms or content the user means, so those choices are
 * always left to the real pickers in Steps 2/3. What it CAN safely do:
 * create/adjust sessions (time windows are just numbers) and set
 * location-independent fields like name/description/recurrence.
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
    const session = createSession({ label: "Happy Hour Content", startTime: "16:00", endTime: "20:00", transition: "fade" });
    session.contentEnabled = true;
    return {
      text: "I've added a 4–8 PM content session for you — open it to pick the actual videos/images from your Content Library.",
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add an ad break", "Fill the rest of the day", "Change the time window"],
    };
  }

  // --- Step 2 (advertisement): "Show this ad in all Nairobi restaurants from 4PM to 8PM, five times per hour." ---
  if (has(text, "4pm") || has(text, "4 pm")) {
    const adSession = createSession({ label: "Happy Hour Ads", startTime: "16:00", endTime: "20:00", transition: "fade" });
    adSession.adsEnabled = true;
    adSession.adFrequency = "Every 12 minutes";
    adSession.adMaxPlaysPerDay = 20;
    return {
      text: "I've started a 4–8 PM ad session for you — pick your actual locations/rooms in Step 2, and the ad creative from your Content Library inside the session.",
      apply: { sessions: [...state.sessions, adSession] },
      suggestions: ["Increase frequency", "Add more locations", "Change time window"],
    };
  }

  // --- Step 3: exact-match suggestion chips ---
  if (has(text, "lunch") && has(text, "session")) {
    const session = createSession({ label: "Lunch", startTime: "12:00", endTime: "15:00", transition: "fade" });
    return {
      text: "Added a Lunch session from 12:00 PM – 3:00 PM. Open it to choose what plays.",
      apply: { sessions: [...state.sessions, session] },
      suggestions: ["Add an evening ad break", "Fill the rest of the day"],
    };
  }

  if (has(text, "evening") && has(text, "ad")) {
    const session = createSession({ label: "Evening Ads", startTime: "20:00", endTime: "22:00", transition: "fade" });
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
    const session = createSession({ label: "General Rotation", startTime: start, endTime: "23:59", transition: "fade" });
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
      suggestions: ["Add a lunch session", "Fill the rest of the day"],
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
      text: "Head to Step 2 and select the locations/rooms you want — I've set the screen mode to \"all screens in selected rooms\".",
      apply: { screenMode: "all" },
      suggestions: ["Add a lunch session", "Fill the rest of the day"],
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
