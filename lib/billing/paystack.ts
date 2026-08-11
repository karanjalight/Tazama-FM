/**
 * Paystack client. SERVER ONLY — reads PAYSTACK_SECRET_KEY, which must never
 * reach the browser. Subscriptions (M-Pesa + card) for the account-level plans.
 */
import crypto from "crypto";

import { getPlan, type SubscriptionPlan } from "@/lib/billing/plans";
import { AI_PRODUCT, AI_PREMIUM_KES } from "@/lib/billing/ai";

const PAYSTACK_BASE = "https://api.paystack.co";

function secret(): string | null {
  return process.env.PAYSTACK_SECRET_KEY ?? null;
}

export function isPaystackConfigured(): boolean {
  return !!secret();
}

/** The Paystack plan code for a paid plan, from env (e.g. PAYSTACK_PLAN_INDIVIDUAL). */
export function planCode(plan: SubscriptionPlan): string | null {
  const env = getPlan(plan).paystackPlanEnv;
  return env ? (process.env[env] ?? null) : null;
}

/**
 * Start a checkout for an account-level subscription. Returns an authorization
 * URL to redirect the browser to, or an error string.
 *
 * `currency` is explicit for the same reason as initAiPremiumCheckout: without
 * it, `amount` is interpreted against the Paystack account's default currency,
 * not whatever this code assumed. When `code` is set (PAYSTACK_PLAN_* is
 * configured), Paystack bills the recurring plan's own configured amount —
 * `amount`/`currency` here are only the fallback for a plan-less one-off charge,
 * so converting plans.ts's prices to Ksh does NOT by itself change what a
 * configured recurring plan actually bills. That plan has to be updated (or
 * recreated) on Paystack's own dashboard to match.
 */
export async function initSubscriptionCheckout(input: {
  email: string;
  plan: SubscriptionPlan;
  accountId: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl?: string; error?: string }> {
  const key = secret();
  if (!key) return { error: "Billing isn't configured yet." };

  const code = planCode(input.plan);
  const body: Record<string, unknown> = {
    email: input.email,
    amount: Math.round(getPlan(input.plan).price * 100), // Ksh subunits; plan overrides
    currency: "KES",
    callback_url: input.callbackUrl,
    metadata: { account_id: input.accountId, plan: input.plan },
  };
  if (code) body.plan = code; // ties the transaction to a recurring plan

  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    } | null;
    if (!res.ok || !json?.status) {
      return { error: json?.message ?? "Could not start checkout." };
    }
    return { authorizationUrl: json.data?.authorization_url };
  } catch {
    return { error: "Could not reach Paystack." };
  }
}

/**
 * Start a one-off checkout for the AI premium add-on (Ksh 80). Passes metadata
 * { product: "ai", user_id } so both the webhook and the redirect callback can
 * grant 30 days of premium to the right user. One-off (no recurring plan) keeps
 * it aligned with the expiry-based premium_access model.
 *
 * `currency` is explicit — without it Paystack falls back to the account's
 * default currency. That's how this used to charge Ksh 3 instead of a
 * meaningful amount: the old code sent `amount: 300` assuming USD cents, but
 * with no currency field a KES-default account reads that as 300 KES
 * subunits — i.e. Ksh 3.00, not $3.
 */
export async function initAiPremiumCheckout(input: {
  email: string;
  userId: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl?: string; error?: string }> {
  const key = secret();
  if (!key) return { error: "Billing isn't configured yet." };

  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(AI_PREMIUM_KES * 100), // smallest currency unit
        currency: "KES",
        callback_url: input.callbackUrl,
        metadata: { product: AI_PRODUCT, user_id: input.userId },
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    } | null;
    if (!res.ok || !json?.status) {
      return { error: json?.message ?? "Could not start checkout." };
    }
    return { authorizationUrl: json.data?.authorization_url };
  } catch {
    return { error: "Could not reach Paystack." };
  }
}

/** Verify a webhook signature (HMAC SHA512 of the raw body with the secret key). */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  const key = secret();
  if (!key || !signature) return false;
  const hash = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a one-off transaction by reference (used on the redirect callback). */
export async function verifyTransaction(reference: string): Promise<{
  ok: boolean;
  plan?: SubscriptionPlan;
  accountId?: string;
  customerCode?: string;
  product?: string;
  userId?: string;
}> {
  const key = secret();
  if (!key) return { ok: false };
  try {
    const res = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const json = (await res.json().catch(() => null)) as {
      data?: {
        status?: string;
        metadata?: {
          account_id?: string;
          plan?: SubscriptionPlan;
          product?: string;
          user_id?: string;
        };
        customer?: { customer_code?: string };
      };
    } | null;
    if (json?.data?.status !== "success") return { ok: false };
    return {
      ok: true,
      plan: json.data.metadata?.plan,
      accountId: json.data.metadata?.account_id,
      customerCode: json.data.customer?.customer_code,
      product: json.data.metadata?.product,
      userId: json.data.metadata?.user_id,
    };
  } catch {
    return { ok: false };
  }
}
