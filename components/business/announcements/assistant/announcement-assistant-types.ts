import type { AnnouncementDraft } from "../new/announcement-draft";

export interface AnnouncementSummaryCard {
  kind: "announcement-summary";
  title: string;
  message: string;
  target: string;
  playback: string;
  time: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  card?: AnnouncementSummaryCard;
  suggestions?: string[];
  showCreateActions?: boolean;
}

export interface AssistantIntentResult {
  text: string;
  card?: AnnouncementSummaryCard;
  apply?: Partial<AnnouncementDraft>;
  suggestions?: string[];
  showCreateActions?: boolean;
}
