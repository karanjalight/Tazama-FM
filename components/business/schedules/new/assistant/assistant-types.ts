import type { ScheduleState } from "../schedule-state";

export type AssistantCard =
  | {
      kind: "content-lineup";
      totalDuration: string;
      items: { title: string; duration: string; thumbnail: string | null }[];
    }
  | {
      kind: "target-summary";
      rows: { icon: "location" | "zone" | "room" | "screen" | "time" | "frequency" | "estimate"; label: string; value: string }[];
      inventory?: { screens: number; playsPerDay: number; exposures: string };
    }
  | {
      kind: "generic-summary";
      title: string;
      rows: { label: string; value: string }[];
    };

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  card?: AssistantCard;
  suggestions?: string[];
}

export interface AssistantIntentResult {
  text: string;
  card?: AssistantCard;
  apply?: Partial<ScheduleState>;
  suggestions?: string[];
}
