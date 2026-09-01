import {
  CreditCard,
  Cpu,
  Globe,
  MessageCircle,
  PlaySquare,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

/** The tab row above the marketplace grid. "All" is not a real integration category. */
export type FilterCategory = "All" | "Payments" | "Music" | "Devices" | "Communication" | "Analytics";

export const FILTER_CATEGORIES: FilterCategory[] = [
  "All",
  "Payments",
  "Music",
  "Devices",
  "Communication",
  "Analytics",
];

export type IntegrationStatus = "connected" | "available" | "coming-soon";

export interface Integration {
  id: string;
  name: string;
  /** Human-facing category label shown on the card, e.g. "Music & Video". */
  categoryLabel: string;
  /** Which filter tab this integration belongs under (Google's "Business Tools" maps to Analytics). */
  filterCategory: Exclude<FilterCategory, "All">;
  description: string;
  status: IntegrationStatus;
  icon: LucideIcon;
  connectedAt?: string;
  account?: string;
  /** Shown in the detail drawer's checkmark list once connected. */
  capabilities?: string[];
  /** Shown in the connect dialog's "Permissions requested" checklist. */
  permissions?: string[];
}

/**
 * Presentation-only metadata for each of the 6 known integrations (icon,
 * display grouping, capability/permission copy). None of this lives in the
 * `integration_catalog` table — name/category/description/status/
 * connectedAt/account now come from `lib/business/settings-queries.ts`'s
 * `listIntegrations()` — this is kept as static UI dressing merged in by
 * `integrations-settings-page.tsx`, keyed by `integration_catalog.key`.
 */
export const INTEGRATION_PRESENTATION: Record<
  string,
  {
    icon: LucideIcon;
    categoryLabel: string;
    filterCategory: Exclude<FilterCategory, "All">;
    capabilities?: string[];
    permissions?: string[];
  }
> = {
  paystack: {
    icon: CreditCard,
    categoryLabel: "Payments",
    filterCategory: "Payments",
    capabilities: ["Payment collection", "Transaction tracking", "Payment status"],
  },
  youtube: {
    icon: PlaySquare,
    categoryLabel: "Music & Video",
    filterCategory: "Music",
    capabilities: ["Music playback", "Video playback", "Content search"],
  },
  mpesa: {
    icon: Smartphone,
    categoryLabel: "Payments",
    filterCategory: "Payments",
  },
  google: {
    icon: Globe,
    categoryLabel: "Business Tools",
    filterCategory: "Analytics",
    capabilities: ["Business profile sync", "Analytics integration", "Account access"],
    permissions: ["Account information", "Business information"],
  },
  whatsapp: {
    icon: MessageCircle,
    categoryLabel: "Communication",
    filterCategory: "Communication",
  },
  longi: {
    icon: Cpu,
    categoryLabel: "Smart Devices",
    filterCategory: "Devices",
    capabilities: ["Device monitoring", "Usage reporting", "Remote configuration"],
    permissions: ["Device inventory access", "Usage data"],
  },
};

const DEFAULT_PRESENTATION: (typeof INTEGRATION_PRESENTATION)[string] = {
  icon: Globe,
  categoryLabel: "Other",
  filterCategory: "Analytics",
};

/** Falls back gracefully for any future `integration_catalog` key added
 * directly in Supabase without a matching presentation entry here. */
export function presentationFor(key: string): (typeof INTEGRATION_PRESENTATION)[string] {
  return INTEGRATION_PRESENTATION[key] ?? DEFAULT_PRESENTATION;
}
