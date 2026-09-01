import type { AnnouncementTargetOptions, TargetOption } from "../mock-data";
import type { AssistantIntentResult } from "./announcement-assistant-types";

/**
 * Scripted "AI" responses — keyword-matched, not a real model. Simulated
 * entirely with local state, same spirit as the Create Schedule wizard's
 * Tazama Assistant.
 *
 * Target ids are real (fetched from Supabase), not the fictional business
 * this script was originally written against — so targets are assembled by
 * matching option NAMES where a script implies one (falling back to the
 * first available option), rather than hardcoded ids that would no longer
 * exist in a real business's data.
 */
function has(text: string, ...words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

function todayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

function findByName(options: TargetOption[], ...needles: string[]): TargetOption | undefined {
  return options.find((o) => needles.some((n) => o.name.toLowerCase().includes(n)));
}

export function matchAnnouncementIntent(
  rawText: string,
  options: AnnouncementTargetOptions,
): AssistantIntentResult | null {
  const text = rawText.toLowerCase();

  // --- "Tell everyone that happy hour starts at 4." ---
  if (has(text, "happy hour") && (has(text, "4") || has(text, "four"))) {
    const mainRoom = findByName(options.rooms, "main hall", "main") ?? options.rooms[0];
    const barRoom = findByName(options.rooms, "bar") ?? options.rooms[1];
    const rooms = [mainRoom, barRoom].filter((r): r is TargetOption => !!r);
    const audioZones = options.audioZones.slice(0, Math.min(2, options.audioZones.length));
    return {
      text: "I'll help you create that announcement.",
      apply: {
        title: "Happy Hour Starting Soon",
        description: "Happy hour starts at 4 PM.",
        target: {
          locationIds: [],
          zoneIds: [],
          roomIds: rooms.map((r) => r.id),
          audioZoneIds: audioZones.map((az) => az.id),
        },
        playbackMode: "reduce",
        reducedVolumePercent: 20,
        sendMode: "schedule",
        scheduleDate: todayLabel(),
        scheduleTime: "16:00",
      },
      card: {
        kind: "announcement-summary",
        title: "Happy Hour Starting Soon",
        message: "Happy hour starts at 4 PM.",
        target: rooms.length ? rooms.map((r) => r.name).join(" + ") : "No rooms available yet",
        playback: "Reduce music volume to 20%",
        time: "Today, 4:00 PM",
      },
      showCreateActions: true,
    };
  }

  if (has(text, "kitchen") && has(text, "clos")) {
    return {
      text: "Got it — I'll set that up as an operational announcement.",
      apply: {
        title: "Kitchen Closing Soon",
        description: "Our kitchen will close in 15 minutes.",
        category: "Operational",
        playbackMode: "reduce",
        reducedVolumePercent: 20,
      },
      suggestions: ["Target all locations", "Pause music instead", "Send now"],
    };
  }

  if (has(text, "table") && has(text, "ready")) {
    return {
      text: "I'll set this up as a quick customer-service announcement.",
      apply: { title: "Your Table Is Ready", description: "Your table is ready.", category: "Customer Service", playbackMode: "reduce", reducedVolumePercent: 30 },
      suggestions: ["Send now", "Target Main Hall"],
    };
  }

  if (has(text, "emergency") || has(text, "evacuat")) {
    return {
      text: "For safety, I've set this as an emergency announcement that pauses the music completely.",
      apply: { category: "Emergency", playbackMode: "pause" },
      suggestions: ["Target all locations", "Send now"],
    };
  }

  if (has(text, "pause") && has(text, "music")) {
    return {
      text: "Switched to Pause Music — the music will stop completely while this plays.",
      apply: { playbackMode: "pause" },
      suggestions: ["Reduce volume instead", "Send now"],
    };
  }

  if (has(text, "reduce") && has(text, "volume")) {
    return {
      text: "Switched to Reduce Volume — music keeps playing quietly underneath.",
      apply: { playbackMode: "reduce" },
      suggestions: ["Pause music instead", "Send now"],
    };
  }

  if (has(text, "all locations")) {
    return {
      text: "Targeting all locations now.",
      apply: {
        target: {
          locationIds: options.locations.map((l) => l.id),
          zoneIds: [],
          roomIds: [],
          audioZoneIds: [],
        },
      },
      suggestions: ["Send now", "Schedule for later"],
    };
  }

  return null;
}
