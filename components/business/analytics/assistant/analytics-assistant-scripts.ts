import type { AnalyticsSnapshot } from "../data-engine";
import type { AssistantIntentResult } from "./analytics-assistant-types";

/** Scripted "AI" responses — keyword-matched, not a real model. Simulated with local state only. */
function has(text: string, ...words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

export function matchAnalyticsIntent(rawText: string, snapshot: AnalyticsSnapshot): AssistantIntentResult | null {
  const text = rawText.toLowerCase();

  if (has(text, "when") && (has(text, "active") || has(text, "customers") || has(text, "audience"))) {
    return {
      text: `Based on the selected period, audience activity is highest between ${snapshot.peakPeriodLabel}, particularly at ${snapshot.audienceKpis.mostActiveLocation}.`,
      card: {
        rows: [
          { label: "Peak Activity", value: snapshot.peakPeriodLabel },
          { label: snapshot.audienceKpis.mostActiveLocation, value: `+${snapshot.peakLiftPct}% vs daily average` },
        ],
      },
      suggestions: ["Which promotion is performing best?", "How is screen uptime?"],
    };
  }

  if (has(text, "promotion") && (has(text, "best") || has(text, "performing") || has(text, "top"))) {
    const top = snapshot.contentPerformance[0];
    return {
      text: `${top.title} is currently your strongest promotional content.`,
      card: {
        rows: [
          { label: "Plays", value: top.plays.toLocaleString() },
          { label: "Estimated reach", value: top.reach.toLocaleString() },
          { label: "Trend", value: `${top.trendPct >= 0 ? "+" : ""}${top.trendPct}% vs previous period` },
        ],
      },
      actions: [{ label: "View Content" }, { label: "Create Schedule" }],
      suggestions: ["When are customers most active?", "How is screen uptime?"],
    };
  }

  if (has(text, "uptime") || (has(text, "screen") && has(text, "health"))) {
    return {
      text: `Screen uptime is averaging ${snapshot.screenSummary.uptimePct}% this period — ${snapshot.screenSummary.attention} screen${snapshot.screenSummary.attention === 1 ? "" : "s"} need${snapshot.screenSummary.attention === 1 ? "s" : ""} attention.`,
      card: {
        rows: [
          { label: "Online", value: String(snapshot.screenSummary.online) },
          { label: "Attention", value: String(snapshot.screenSummary.attention) },
          { label: "Offline", value: String(snapshot.screenSummary.offline) },
        ],
      },
      suggestions: ["Which promotion is performing best?", "When are customers most active?"],
    };
  }

  if (has(text, "location") && (has(text, "best") || has(text, "top"))) {
    const top = snapshot.locationPerformance.reduce((a, b) => (b.reach > a.reach ? b : a));
    return {
      text: `${top.name} is your top-performing location this period.`,
      card: {
        rows: [
          { label: "Screens", value: String(top.screens) },
          { label: "Uptime", value: `${top.uptimePct}%` },
          { label: "Reach", value: top.reach.toLocaleString() },
        ],
      },
      suggestions: ["When are customers most active?", "Which promotion is performing best?"],
    };
  }

  return null;
}
