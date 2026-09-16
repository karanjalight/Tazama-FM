import type {
  Campaign,
  CampaignObjective,
  CampaignPriority,
  CampaignTarget,
  PlacementType,
} from "@/lib/business/campaign-types";
import { DEFAULT_IMAGE_AD_SECONDS } from "@/lib/business/ad-scheduling";

/**
 * The wizard's editable form state. There is only one way to end up with a
 * creative — `creativeId`, a real `content_items.id` (an inline upload goes
 * through `uploadAdCreative` immediately, see steps/creative-step.tsx).
 */
export interface CampaignDraft {
  name: string;
  advertiserName: string;
  objective: CampaignObjective;

  creativeId: string | null;
  /** How long an image/document ad stays on screen. */
  displaySeconds: number;

  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  screenIds: string[];

  placementType: PlacementType;
  /** Bare integer minutes as a string — see campaign-types.ts's FREQUENCY_OPTIONS. */
  frequencyMinutes: string;
  maxPlaysPerDay: number;
  priority: CampaignPriority;

  budgetType: "total" | "daily";
  budgetAmount: number;

  startDate: string;
  endDate: string;
  activeStart: string;
  activeEnd: string;
}

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function defaultCampaignDraft(): CampaignDraft {
  return {
    name: "",
    advertiserName: "",
    objective: "Promotion",
    creativeId: null,
    displaySeconds: DEFAULT_IMAGE_AD_SECONDS,
    locationIds: [],
    zoneIds: [],
    roomIds: [],
    screenIds: [],
    placementType: "Between Content",
    frequencyMinutes: "15",
    maxPlaysPerDay: 20,
    priority: "Normal",
    budgetType: "daily",
    budgetAmount: 5000,
    startDate: isoDate(0),
    endDate: isoDate(13),
    activeStart: "16:00",
    activeEnd: "21:00",
  };
}

export function draftFromCampaign(c: Campaign): CampaignDraft {
  const base = defaultCampaignDraft();
  return {
    name: c.name,
    advertiserName: c.advertiserName ?? "",
    objective: c.objective,
    creativeId: c.creativeId,
    displaySeconds: c.displaySeconds ?? base.displaySeconds,
    locationIds: c.target.locationIds,
    zoneIds: c.target.zoneIds,
    roomIds: c.target.roomIds,
    screenIds: c.target.screenIds,
    placementType: c.placementType,
    frequencyMinutes: c.frequencyMinutes ?? base.frequencyMinutes,
    maxPlaysPerDay: c.maxPlaysPerDay ?? 0,
    priority: c.priority,
    budgetType: c.budgetType,
    budgetAmount: c.budgetAmount ?? 0,
    startDate: c.startDate ?? "",
    endDate: c.endDate ?? "",
    activeStart: c.activeStartTime ?? "",
    activeEnd: c.activeEndTime ?? "",
  };
}

export function draftTarget(d: CampaignDraft): CampaignTarget {
  return { locationIds: d.locationIds, zoneIds: d.zoneIds, roomIds: d.roomIds, screenIds: d.screenIds };
}
