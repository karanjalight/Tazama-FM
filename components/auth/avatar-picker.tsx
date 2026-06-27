"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { avatars } from "@/lib/auth/avatars";
import { cn } from "@/lib/utils";

export function AvatarPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (key: string) => void;
  error?: string;
}) {
  const selected = avatars.find((a) => a.key === value);

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Choose an avatar"
        className="grid grid-cols-3 gap-3 sm:grid-cols-3"
      >
        {avatars.map((a) => {
          const active = value === a.key;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={a.label}
              onClick={() => onChange(a.key)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-2xl border transition-all",
                "hover:-translate-y-0.5 hover:shadow-soft",
                active
                  ? "border-brand ring-2 ring-brand"
                  : "border-border ring-0",
              )}
            >
              <Image
                src={`/avatars/${a.key}.svg`}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
              {active && (
                <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-brand text-white shadow-sm">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {selected ? (
            <>
              Selected{" "}
              <span className="font-medium text-foreground">
                {selected.label}
              </span>
            </>
          ) : (
            "Pick the look that represents you."
          )}
        </p>
      )}
    </div>
  );
}
