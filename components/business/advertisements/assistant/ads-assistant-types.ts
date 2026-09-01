import type { CampaignDraft } from "../new/campaign-draft";

export interface AdsAssistantCard {
  rows: { label: string; value: string }[];
}

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  card?: AdsAssistantCard;
  showContinueActions?: boolean;
  suggestions?: string[];
}

export interface AssistantIntentResult {
  text: string;
  card?: AdsAssistantCard;
  apply?: Partial<CampaignDraft>;
  showContinueActions?: boolean;
  suggestions?: string[];
}
