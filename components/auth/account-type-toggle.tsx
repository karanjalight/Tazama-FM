"use client";

import { Building2, Check, User } from "lucide-react";

import { cn } from "@/lib/utils";

export type AccountType = "individual" | "business";

const OPTIONS: {
  value: AccountType;
  title: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: "individual",
    title: "Individual",
    description: "Listen and host rooms with friends.",
    icon: User,
  },
  {
    value: "business",
    title: "Business",
    description: "Music for your venue or space.",
    icon: Building2,
  },
];

export function AccountTypeToggle({
  value,
  onChange,
}: {
  value: AccountType | "";
  onChange: (value: AccountType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group relative flex flex-col gap-2.5 rounded-2xl border p-4 text-left transition-all",
              "hover:border-foreground/30",
              selected
                ? "border-brand bg-brand/[0.04] ring-1 ring-brand"
                : "border-border bg-background",
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-colors",
                selected
                  ? "bg-brand text-white"
                  : "bg-muted text-muted-foreground group-hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {opt.title}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {opt.description}
              </span>
            </span>
            {selected && (
              <span className="absolute top-3 right-3 grid size-4 place-items-center rounded-full bg-brand text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
