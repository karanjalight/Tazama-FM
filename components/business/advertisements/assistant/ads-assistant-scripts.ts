import type { AssistantIntentResult } from "./ads-assistant-types";

/** Scripted "AI" responses — keyword-matched, not a real model. Simulated with local state only, same pattern as the Schedule/Announcement assistants. */
function has(text: string, ...words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

export function matchAdsIntent(rawText: string): AssistantIntentResult | null {
  const text = rawText.toLowerCase();

  if (has(text, "promote") && (has(text, "weekend") || has(text, "offer"))) {
    return {
      text: "I can help set that up.",
      apply: {
        name: "Weekend Offer",
        locationIds: ["nairobi-cbd"],
        activeStart: "16:00",
        activeEnd: "21:00",
        frequency: "Every 15 minutes",
      },
      card: {
        rows: [
          { label: "Campaign", value: "Weekend Offer" },
          { label: "Location", value: "Nairobi" },
          { label: "Time", value: "Friday – Sunday, 4 PM – 9 PM" },
          { label: "Suggested placement", value: "Every 15 minutes" },
          { label: "Estimated inventory", value: "42 screens" },
        ],
      },
      showContinueActions: true,
      suggestions: ["Where should I advertise for highest activity?", "What's my estimated budget?"],
    };
  }

  if (has(text, "where") && has(text, "advertise")) {
    return {
      text: "Based on the selected period, Nairobi CBD has the highest aggregate audience activity, especially between 6 PM and 8 PM.",
      card: {
        rows: [
          { label: "Nairobi CBD", value: "" },
          { label: "Peak", value: "6 – 8 PM" },
          { label: "Activity", value: "+32%" },
        ],
      },
      suggestions: ["Promote our weekend offer in Nairobi", "What's my estimated budget?"],
    };
  }

  if (has(text, "budget")) {
    return {
      text: "A daily budget of KES 5,000 typically delivers around 4,200 plays and 8,400 estimated reach — you can adjust this in Step 4 of the campaign wizard.",
      suggestions: ["Promote our weekend offer in Nairobi", "Where should I advertise for highest activity?"],
    };
  }

  if (has(text, "best") && has(text, "campaign")) {
    return {
      text: "Happy Hour Promo has the highest completion rate among active campaigns.",
      card: { rows: [{ label: "Completion", value: "94%" }] },
      suggestions: ["Promote our weekend offer in Nairobi", "Where should I advertise for highest activity?"],
    };
  }

  return null;
}
