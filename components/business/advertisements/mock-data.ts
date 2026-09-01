import type { CampaignObjective, CampaignStatus, CreativeFormat, PlacementType } from "./types";
import { newId } from "./types";

export const ADVERTISERS = ["XYZ Restaurant", "Verifier Bar & Grill"] as const;

export interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  creativeId: string | null;
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  placementType: PlacementType;
  frequency: string;
  maxPlaysPerDay: number;
  priority: "Low" | "Normal" | "High" | "Critical";
  budgetType: "total" | "daily";
  budgetAmount: number;
  startDate: string;
  endDate: string;
  activeStart: string;
  activeEnd: string;
  plays: number;
  reach: number;
  completionPct: number;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "camp-happy-hour",
    name: "Happy Hour Promo",
    advertiser: "XYZ Restaurant",
    objective: "Promotion",
    status: "Active",
    creativeId: "creative-happy-hour",
    locationIds: ["nairobi-cbd"],
    zoneIds: ["main-floor"],
    roomIds: ["main-hall", "bar-area"],
    placementType: "Between Content",
    frequency: "Every 15 minutes",
    maxPlaysPerDay: 20,
    priority: "Normal",
    budgetType: "daily",
    budgetAmount: 5000,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    activeStart: "16:00",
    activeEnd: "19:00",
    plays: 8420,
    reach: 16240,
    completionPct: 94,
  },
  {
    id: "camp-weekend-special",
    name: "Weekend Special",
    advertiser: "XYZ Restaurant",
    objective: "Event",
    status: "Active",
    creativeId: "creative-weekend-special",
    locationIds: ["nairobi-cbd", "westlands"],
    zoneIds: ["rooftop"],
    roomIds: ["rooftop-lounge", "rooftop-bar"],
    placementType: "Between Content",
    frequency: "Every 15 minutes",
    maxPlaysPerDay: 20,
    priority: "Normal",
    budgetType: "daily",
    budgetAmount: 4000,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    activeStart: "18:00",
    activeEnd: "23:00",
    plays: 5820,
    reach: 12430,
    completionPct: 91,
  },
  {
    id: "camp-lunch-promo",
    name: "Lunch Promotion",
    advertiser: "Verifier Bar & Grill",
    objective: "Promotion",
    status: "Active",
    creativeId: "creative-lunch-promo",
    locationIds: ["nairobi-cbd"],
    zoneIds: ["main-floor"],
    roomIds: ["main-hall"],
    placementType: "Dedicated Ad Slot",
    frequency: "Every 30 minutes",
    maxPlaysPerDay: 12,
    priority: "Low",
    budgetType: "daily",
    budgetAmount: 2500,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    activeStart: "12:00",
    activeEnd: "15:00",
    plays: 4240,
    reach: 9120,
    completionPct: 89,
  },
  {
    id: "camp-new-product",
    name: "New Product",
    advertiser: "Verifier Bar & Grill",
    objective: "Product Launch",
    status: "Paused",
    creativeId: "creative-new-product",
    locationIds: ["westlands"],
    zoneIds: [],
    roomIds: [],
    placementType: "Between Content",
    frequency: "Every 15 minutes",
    maxPlaysPerDay: 15,
    priority: "Normal",
    budgetType: "total",
    budgetAmount: 20000,
    startDate: "2026-08-10",
    endDate: "2026-09-10",
    activeStart: "09:00",
    activeEnd: "21:00",
    plays: 2840,
    reach: 6420,
    completionPct: 76,
  },
];

export interface Creative {
  id: string;
  name: string;
  format: CreativeFormat;
  durationLabel: string | null;
  thumbnail: string | null;
  dimensions: string | null;
  uploadedLabel: string;
  archived: boolean;
}

export const CREATIVES: Creative[] = [
  {
    id: "creative-happy-hour",
    name: "Happy Hour Promo",
    format: "Video",
    durationLabel: "00:15",
    thumbnail: "https://images.pexels.com/photos/4762719/pexels-photo-4762719.jpeg?auto=compress&cs=tinysrgb&w=400",
    dimensions: "1920 × 1080",
    uploadedLabel: "Aug 12, 2026",
    archived: false,
  },
  {
    id: "creative-weekend-special",
    name: "Weekend Special",
    format: "Video",
    durationLabel: "00:18",
    thumbnail: "https://images.pexels.com/photos/31694642/pexels-photo-31694642.jpeg?auto=compress&cs=tinysrgb&w=400",
    dimensions: "1920 × 1080",
    uploadedLabel: "Aug 10, 2026",
    archived: false,
  },
  {
    id: "creative-lunch-promo",
    name: "Lunch Promotion",
    format: "Image",
    durationLabel: null,
    thumbnail: "https://images.pexels.com/photos/15010311/pexels-photo-15010311.jpeg?auto=compress&cs=tinysrgb&w=400",
    dimensions: "1920 × 1080",
    uploadedLabel: "Aug 8, 2026",
    archived: false,
  },
  {
    id: "creative-new-product",
    name: "New Product Launch",
    format: "Video",
    durationLabel: "00:20",
    thumbnail: "https://images.pexels.com/photos/9882303/pexels-photo-9882303.jpeg?auto=compress&cs=tinysrgb&w=400",
    dimensions: "1920 × 1080",
    uploadedLabel: "Aug 20, 2026",
    archived: false,
  },
  {
    id: "creative-brand-jingle",
    name: "Brand Jingle",
    format: "Audio",
    durationLabel: "00:10",
    thumbnail: null,
    dimensions: null,
    uploadedLabel: "Jul 28, 2026",
    archived: false,
  },
  {
    id: "creative-rooftop-ambience",
    name: "Rooftop Ambience Ad",
    format: "Video",
    durationLabel: "00:12",
    thumbnail: null,
    dimensions: "1920 × 1080",
    uploadedLabel: "Jul 15, 2026",
    archived: false,
  },
  {
    id: "creative-old-menu",
    name: "Old Menu Promo",
    format: "Video",
    durationLabel: "00:14",
    thumbnail: null,
    dimensions: "1920 × 1080",
    uploadedLabel: "Jun 2, 2026",
    archived: true,
  },
];

export function creativeUsageCount(creativeId: string): number {
  return CAMPAIGNS.filter((c) => c.creativeId === creativeId).length;
}

export function newCampaignId(): string {
  return newId("camp");
}
export function newCreativeId(): string {
  return newId("creative");
}
