import Link from "next/link";
import {
  Building2,
  Clock,
  LayoutGrid,
  Plus,
  QrCode,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { businessFeatures } from "@/lib/data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IconKey } from "@/lib/data";

const ICONS: Partial<Record<IconKey, LucideIcon>> = {
  "shield-check": ShieldCheck,
  "qr-code": QrCode,
  clock: Clock,
  "layout-grid": LayoutGrid,
};

export function BusinessPanel({
  businessName,
  industry,
}: {
  businessName: string;
  industry: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-section-alt p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-white dark:bg-white dark:text-ink">
            <Building2 className="size-6" />
          </span>
          <div>
            <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              Your venue
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {businessName}
            </h2>
            <span className="mt-1 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {industry}
            </span>
          </div>
        </div>

        <Link
          href="/business/dashboard"
          className={cn(
            buttonVariants({ variant: "brand" }),
            "h-10 gap-2 rounded-xl px-4 text-[14px]",
          )}
        >
          <Plus className="size-4" />
          Go to business dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {businessFeatures.map((f) => {
          const Icon = ICONS[f.icon] ?? Building2;
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground">
                <Icon className="size-4.5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
