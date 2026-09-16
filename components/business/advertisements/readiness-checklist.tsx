import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

export interface AdReadiness {
  schemaReady: boolean;
  approvedCreatives: number;
  liveCampaigns: number;
  screens: number;
  onlineScreens: number;
}

export function isAdServingReady(r: AdReadiness): boolean {
  return r.schemaReady && r.approvedCreatives > 0 && r.liveCampaigns > 0 && r.onlineScreens > 0;
}

/** Shown on the Overview until ads can actually air end to end. */
export function ReadinessChecklist({ readiness }: { readiness: AdReadiness }) {
  const steps = [
    {
      done: readiness.schemaReady,
      title: "Ad serving database update applied",
      detail: "Run supabase/business-ad-serving.sql in the Supabase SQL editor (safe to re-run).",
      href: null,
    },
    {
      done: readiness.approvedCreatives > 0,
      title: "An approved creative",
      detail: "Upload an ad and approve it — unapproved creatives never air.",
      href: "/business/advertisements/library",
    },
    {
      done: readiness.liveCampaigns > 0,
      title: "An active campaign running today",
      detail: "Needs a creative, a target, a frequency, and today inside its dates.",
      href: "/business/advertisements/campaigns",
    },
    {
      done: readiness.onlineScreens > 0,
      title: "A paired screen online",
      detail: `${readiness.onlineScreens} of ${readiness.screens} screens online. Open the kiosk player on a paired screen.`,
      href: "/business/branches",
    },
  ];

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
      <h2 className="text-base font-semibold text-foreground">Get ads on air</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Every number on this page is real, so it stays at zero until these are done.</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((step) => {
          const body = (
            <>
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className={step.done ? "text-sm font-medium text-muted-foreground line-through" : "text-sm font-medium text-foreground"}>
                  {step.title}
                </span>
                {!step.done && <span className="block text-xs text-muted-foreground">{step.detail}</span>}
              </span>
            </>
          );
          return (
            <li key={step.title}>
              {step.href && !step.done ? (
                <Link href={step.href} className="flex gap-2.5 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                <div className="flex gap-2.5 rounded-xl border border-border bg-card p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
