/**
 * Subscription plans. Account-level, monthly — a single subscription unlocks
 * every room the account hosts. Pure data, safe on client + server.
 *
 * Paystack plan codes are read from env (server-side, when creating a checkout).
 * Prices are display-only here; the real amount comes from the Paystack plan.
 */
export type SubscriptionPlan = "free" | "individual" | "business";

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  /** Display price, USD/month. */
  price: number;
  /** Max concurrent listeners a room hosted on this plan allows. */
  listenerCap: number;
  /** Total listening minutes per room (null = unlimited). Free is capped. */
  minutesCapPerRoom: number | null;
  tagline: string;
  perks: string[];
  /** Which account types this plan is offered to (free = everyone). */
  forAccountTypes: ("individual" | "business")[];
  /** Env var holding this plan's Paystack plan code (paid plans only). */
  paystackPlanEnv?: string;
}

export const FREE_MINUTES_CAP = 120; // 2 hours total listening per room

export const PLANS: Record<SubscriptionPlan, Plan> = {
  free: {
    id: "free",
    name: "Preview",
    price: 0,
    listenerCap: 6,
    minutesCapPerRoom: FREE_MINUTES_CAP,
    tagline: "Start a hangout in seconds",
    perks: ["Up to 6 listeners", "2 hours of listening per room", "Collaborative queue"],
    forAccountTypes: ["individual", "business"],
  },
  individual: {
    id: "individual",
    name: "Individual",
    price: 4,
    listenerCap: 100,
    minutesCapPerRoom: null,
    tagline: "For hosts who keep the vibe going",
    perks: ["Up to 100 listeners", "Unlimited listening time", "Priority sync"],
    forAccountTypes: ["individual"],
    paystackPlanEnv: "PAYSTACK_PLAN_INDIVIDUAL",
  },
  business: {
    id: "business",
    name: "Business",
    price: 10,
    listenerCap: 200,
    minutesCapPerRoom: null,
    tagline: "For venues and spaces",
    perks: ["Up to 200 listeners", "Unlimited listening time", "Multi-room ready"],
    forAccountTypes: ["business"],
    paystackPlanEnv: "PAYSTACK_PLAN_BUSINESS",
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "individual", "business"];

export function getPlan(plan: SubscriptionPlan): Plan {
  return PLANS[plan];
}

/** The listener cap for a given plan. */
export function listenerCapFor(plan: SubscriptionPlan): number {
  return PLANS[plan].listenerCap;
}

/** Paid plans an account of this type can upgrade to, in display order. */
export function upgradablePlans(
  accountType: "individual" | "business" | null,
): Plan[] {
  return PLAN_ORDER.map((id) => PLANS[id]).filter(
    (p) =>
      p.id !== "free" &&
      (accountType ? p.forAccountTypes.includes(accountType) : true),
  );
}
