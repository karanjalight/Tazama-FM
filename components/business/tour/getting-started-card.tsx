"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Check, CirclePlay, X } from "lucide-react";

import { dismissChecklist } from "@/app/business/onboarding/actions";
import { checklistProgress, type ChecklistItem } from "@/lib/business/onboarding-checklist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusinessTour } from "./tour-provider";

export function GettingStartedCard({ items }: { items: ChecklistItem[] }) {
  const { start } = useBusinessTour();
  const [hidden, setHidden] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const { done, total } = checklistProgress(items);
  const nextId = items.find((i) => !i.done)?.id;

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    startTransition(async () => {
      const result = await dismissChecklist();
      if (!result.ok) {
        setHidden(false);
        toast.error(result.error);
      }
    });
  };

  return (
    <section aria-labelledby="getting-started-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Getting started · {done} of {total}
          </p>
          <h2 id="getting-started-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Get your venue running
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A few steps and your screens and speakers are live. Each one ticks itself off as you go.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="lg" onClick={() => start("checklist")} className="hidden sm:inline-flex">
            <CirclePlay data-icon="inline-start" />
            Replay tour
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label="Hide getting started" onClick={dismiss}>
            <X />
          </Button>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "group flex h-full items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-muted/60",
                item.id === nextId ? "border-foreground/25 bg-muted/40" : "border-border",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                  item.done ? "border-foreground bg-foreground text-background" : "border-border",
                )}
              >
                {item.done && <Check className="size-3" strokeWidth={3} />}
                <span className="sr-only">{item.done ? "Done:" : "To do:"}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", item.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{item.description}</span>
              </span>
              {!item.done && (
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="lg" onClick={() => start("checklist")} className="mt-4 w-full sm:hidden">
        <CirclePlay data-icon="inline-start" />
        Replay tour
      </Button>
    </section>
  );
}
