import type { BudgetType, CampaignObjective, CreativeFormat, PlacementType } from "../types";

export interface UploadedCreative {
  name: string;
  format: CreativeFormat;
  url: string;
  durationLabel: string | null;
}

export interface CampaignDraft {
  name: string;
  advertiser: string;
  objective: CampaignObjective;

  creativeId: string | null;
  uploadedCreative: UploadedCreative | null;

  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];

  placementType: PlacementType;
  frequency: string;
  maxPlaysPerDay: number;
  priority: "Low" | "Normal" | "High" | "Critical";

  budgetType: BudgetType;
  budgetAmount: number;

  startDate: string;
  endDate: string;
  activeStart: string;
  activeEnd: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export const DEFAULT_CAMPAIGN_DRAFT: CampaignDraft = {
  name: "",
  advertiser: "Verifier Bar & Grill",
  objective: "Promotion",

  creativeId: null,
  uploadedCreative: null,

  locationIds: [],
  zoneIds: [],
  roomIds: [],

  placementType: "Between Content",
  frequency: "Every 15 minutes",
  maxPlaysPerDay: 20,
  priority: "Normal",

  budgetType: "daily",
  budgetAmount: 5000,

  startDate: todayIso(),
  endDate: plusDaysIso(14),
  activeStart: "16:00",
  activeEnd: "21:00",
};
