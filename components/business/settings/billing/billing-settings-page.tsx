"use client";

import * as React from "react";

import { BillingHistory } from "./billing-history";
import { CurrentPlan } from "./current-plan";
import { INITIAL_PAYMENT_METHOD, type PaymentMethodState, type PlanId } from "./mock-data";
import { PaymentMethod } from "./payment-method";
import { PlanComparison } from "./plan-comparison";
import { UsageCard } from "./usage-card";
import type { BillingSummary } from "@/lib/business/settings-queries";

/**
 * Read-only billing slice: `billing` (current plan/status + real usage) is
 * fetched server-side and passed in as a prop. Everything else here —
 * Manage Plan, Choose Starter/Business, Contact Sales, payment method,
 * invoices — stays exactly the toast-only mock it was: no payment flow is
 * wired up in this pass (see the plan's explicit "read-only Billing slice"
 * scope). `planId` seeds from the real current plan but is still just local
 * state afterward, same as before, so the mock "Manage Plan" dialog keeps
 * working as a preview.
 */
export function BillingSettingsPage({ billing }: { billing: BillingSummary }) {
  const [planId, setPlanId] = React.useState<PlanId>(billing.plan);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodState>(INITIAL_PAYMENT_METHOD);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, usage, payment methods and invoices.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CurrentPlan planId={planId} status={billing.status} onChangePlan={setPlanId} />
        </div>
        <UsageCard usage={billing.usage} limits={billing.limits} />
      </div>

      <PlanComparison planId={planId} onChangePlan={setPlanId} />

      <PaymentMethod method={paymentMethod} onChange={setPaymentMethod} />

      <BillingHistory />
    </div>
  );
}
