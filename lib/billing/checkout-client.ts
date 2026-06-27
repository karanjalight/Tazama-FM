"use client";

import type { SubscriptionPlan } from "@/lib/billing/plans";

/**
 * Kick off a Paystack checkout from the browser. POSTs to our server route
 * (which talks to Paystack with the secret key) and redirects to the returned
 * authorization URL. Resolves to an error string on failure, or null on success
 * (the browser is navigating away).
 */
export async function startCheckout(
  plan: SubscriptionPlan,
  opts?: { callbackPath?: string },
): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, callbackPath: opts?.callbackPath }),
    });
    const data = (await res.json()) as {
      authorizationUrl?: string;
      error?: string;
    };
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return null;
    }
    return data.error ?? "Could not start checkout.";
  } catch {
    return "Could not reach the billing service.";
  }
}
