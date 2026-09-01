export interface AnalyticsAssistantCard {
  rows: { label: string; value: string }[];
}

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  card?: AnalyticsAssistantCard;
  actions?: { label: string; href?: string }[];
  suggestions?: string[];
}

export interface AssistantIntentResult {
  text: string;
  card?: AnalyticsAssistantCard;
  actions?: { label: string; href?: string }[];
  suggestions?: string[];
}
