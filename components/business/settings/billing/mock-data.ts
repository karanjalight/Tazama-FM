export type PlanId = "starter" | "business" | "enterprise";

export interface PlanOption {
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  /** Condensed comparison bullets shown on the plan-comparison cards. */
  features: string[];
}

export const PLAN_ORDER: PlanId[] = ["starter", "business", "enterprise"];

export const PLAN_CATALOG: Record<PlanId, PlanOption> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: "KES 1,999 / month",
    tagline: "For small businesses",
    features: ["5 locations", "25 screens", "Basic analytics", "Content management", "Scheduling"],
  },
  business: {
    id: "business",
    name: "Business",
    price: "KES 4,999 / month",
    tagline: "For growing businesses",
    features: [
      "10 locations",
      "100 screens",
      "Advanced analytics",
      "Advertising",
      "Audience Insights",
      "Reports",
      "Announcements",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom pricing",
    tagline: "For large networks",
    features: [
      "Unlimited locations",
      "Unlimited screens",
      "Advanced permissions",
      "Custom integrations",
      "Priority support",
      "Dedicated account management",
    ],
  },
};

/**
 * Fuller "what's included" checklist shown under the Current Plan card.
 * Intentionally a broader list than the condensed comparison bullets above —
 * this always reflects the Business plan's full feature set, since that's
 * the plan being actively marketed on this card in the mock.
 */
export const CURRENT_PLAN_FEATURES = [
  "10 locations",
  "100 screens",
  "Unlimited rooms",
  "Content management",
  "Scheduling",
  "Announcements",
  "Analytics",
  "Advertising",
  "Audience Insights",
];

export const NEXT_BILLING_DATE = "September 29, 2026";

export interface UsageMetric {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit?: string;
  /** Decimal places to show for the "used" value (e.g. storage in GB). */
  decimals?: number;
}

export const USAGE_METRICS: UsageMetric[] = [
  { id: "locations", label: "Locations", used: 7, limit: 10 },
  { id: "screens", label: "Screens", used: 68, limit: 100 },
  { id: "storage", label: "Storage", used: 18.4, limit: 50, unit: "GB", decimals: 1 },
  { id: "team", label: "Team Members", used: 8, limit: 15 },
];

export type PaymentMethodType = "card" | "mpesa" | "bank";

export interface PaymentMethodState {
  type: PaymentMethodType;
  label: string;
  expiry: string;
  isPrimary: boolean;
}

export const INITIAL_PAYMENT_METHOD: PaymentMethodState = {
  type: "card",
  label: "Visa •••• 4242",
  expiry: "08/28",
  isPrimary: true,
};

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid";
}

export const INVOICES: Invoice[] = [
  { id: "inv-2026-08", date: "Aug 29 2026", description: "Business Plan", amount: "KES 4,999", status: "paid" },
  { id: "inv-2026-07", date: "Jul 29 2026", description: "Business Plan", amount: "KES 4,999", status: "paid" },
  { id: "inv-2026-06", date: "Jun 29 2026", description: "Business Plan", amount: "KES 4,999", status: "paid" },
];
