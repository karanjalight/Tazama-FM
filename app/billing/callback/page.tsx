import { redirect } from "next/navigation";

import { verifyTransaction } from "@/lib/billing/paystack";
import { upsertSubscription } from "@/lib/billing/subscription";
import { activatePremium } from "@/lib/premium";
import { AI_PRODUCT } from "@/lib/billing/ai";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Paystack redirects here after checkout. We verify the transaction server-side
 * and unlock immediately (the webhook is the durable source of truth, but this
 * means the user doesn't have to wait for it), then return them to their room.
 */
export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reference = first(sp.reference) ?? first(sp.trxref);
  const nextParam = first(sp.next) ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (reference) {
    const v = await verifyTransaction(reference);
    if (v.ok && v.product === AI_PRODUCT && v.userId) {
      // AI premium add-on — grant 30 days (idempotent).
      await activatePremium(v.userId);
    } else if (v.ok && v.accountId && v.plan) {
      await upsertSubscription({
        accountId: v.accountId,
        plan: v.plan,
        status: "active",
        paystackCustomerCode: v.customerCode ?? null,
      });
    }
  }

  redirect(next);
}
