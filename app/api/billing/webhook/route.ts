import { NextResponse } from "next/server";

import { verifyWebhook } from "@/lib/billing/paystack";
import {
  upsertSubscription,
  downgradeByCustomerCode,
} from "@/lib/billing/subscription";
import type { SubscriptionPlan } from "@/lib/billing/plans";

const PAID: ReadonlySet<string> = new Set(["individual", "business"]);

/**
 * Paystack webhook. Verifies the signature against the raw body, then keeps the
 * account's subscription in sync. Idempotent (upserts).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      metadata?: { account_id?: string; plan?: string };
      customer?: { customer_code?: string };
      subscription_code?: string;
      next_payment_date?: string;
      plan?: { plan_code?: string };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = event.event;
  const data = event.data ?? {};
  const accountId = data.metadata?.account_id;
  const plan = data.metadata?.plan;
  const customerCode = data.customer?.customer_code ?? null;

  if (type === "charge.success" && accountId && plan && PAID.has(plan)) {
    await upsertSubscription({
      accountId,
      plan: plan as SubscriptionPlan,
      status: "active",
      paystackCustomerCode: customerCode,
    });
  } else if (type === "subscription.create" && accountId) {
    await upsertSubscription({
      accountId,
      plan: (plan && PAID.has(plan) ? plan : "individual") as SubscriptionPlan,
      status: "active",
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: data.subscription_code ?? null,
      currentPeriodEnd: data.next_payment_date ?? null,
    });
  } else if (
    (type === "subscription.disable" || type === "subscription.not_renew") &&
    customerCode
  ) {
    await downgradeByCustomerCode(customerCode);
  }

  return NextResponse.json({ received: true });
}
