/**
 * Subscription reads + writes. SERVER ONLY (uses the service-role client so it
 * works the same in demo + real auth, and so the webhook can upsert).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionPlan } from "@/lib/billing/plans";

export interface SubscriptionRecord {
  accountId: string;
  plan: SubscriptionPlan;
  status: string;
  currentPeriodEnd: string | null;
}

const PLANS: ReadonlySet<string> = new Set(["free", "individual", "business"]);

/** The account's active plan. Defaults to "free" when unset or unreachable. */
export async function getPlanForAccount(
  accountId: string,
): Promise<SubscriptionPlan> {
  const admin = createAdminClient();
  if (!admin) return "free";

  const { data } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!data || data.status !== "active") return "free";
  return PLANS.has(data.plan) ? (data.plan as SubscriptionPlan) : "free";
}

/** Upsert a subscription (called by the Paystack webhook). */
export async function upsertSubscription(input: {
  accountId: string;
  plan: SubscriptionPlan;
  status: string;
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const row: Record<string, unknown> = {
    account_id: input.accountId,
    plan: input.plan,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  // Only overwrite Paystack codes when we actually have them (don't null them out).
  if (input.paystackCustomerCode) row.paystack_customer_code = input.paystackCustomerCode;
  if (input.paystackSubscriptionCode)
    row.paystack_subscription_code = input.paystackSubscriptionCode;
  if (input.currentPeriodEnd) row.current_period_end = input.currentPeriodEnd;

  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "account_id" });
  return !error;
}

/** Cancel + downgrade the subscription owning a given Paystack customer code. */
export async function downgradeByCustomerCode(
  customerCode: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("paystack_customer_code", customerCode);
  return !error;
}
