import type { CampaignTargetOptions } from "@/lib/business/campaign-types";
import type { AssistantIntentResult } from "./ads-assistant-types";

/** Scripted "AI" responses — keyword-matched, not a real model. Simulated
 * with local state only, same pattern as the Schedule/Announcement
 * assistants. Takes real `targetOptions` (rather than a hardcoded fictional
 * location id) so it degrades gracefully against whatever a real business's
 * locations actually happen to be named — same fix Announcements' own
 * assistant already needed for this exact class of problem. */
function has(text: string, ...words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

export function matchAdsIntent(rawText: string, targetOptions: CampaignTargetOptions): AssistantIntentResult | null {
  const text = rawText.toLowerCase();

  if (has(text, "promote") && (has(text, "weekend") || has(text, "offer"))) {
    const location =
      targetOptions.locations.find((l) => l.name.toLowerCase().includes("nairobi")) ?? targetOptions.locations[0];
    return {
      text: "I can help set that up.",
      apply: {
        name: "Weekend Offer",
        locationIds: location ? [location.id] : [],
        activeStart: "16:00",
        activeEnd: "21:00",
        frequencyMinutes: "15",
      },
      card: {
        rows: [
          { label: "Campaign", value: "Weekend Offer" },
          { label: "Location", value: location?.name ?? "Add a location first" },
          { label: "Time", value: "4 PM – 9 PM" },
          { label: "Suggested placement", value: "Every 15 minutes" },
        ],
      },
      showContinueActions: true,
      suggestions: ["Where should I advertise for highest activity?", "What's my estimated budget?"],
    };
  }

  if (has(text, "where") && has(text, "advertise")) {
    const top = targetOptions.locations[0];
    return {
      text: top
        ? `${top.name} is a good place to start — it's one of your active locations.`
        : "Add a location under Locations first, then I can suggest where to advertise.",
      suggestions: ["Promote our weekend offer in Nairobi", "What's my estimated budget?"],
    };
  }

  if (has(text, "budget")) {
    return {
      text: "Pick where the ad runs first — Step 4 then projects plays, views, reach and revenue per day from those rooms' real capacity and each screen's CPM, and shows how much of your budget that uses.",
      suggestions: ["Promote our weekend offer in Nairobi", "Where should I advertise for highest activity?"],
    };
  }

  return null;
}
