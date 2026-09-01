"use client";

import { cn } from "@/lib/utils";

/**
 * A segmented pill group backed by real `<input type="radio">` elements
 * (visually hidden, `sr-only`) so keyboard/a11y semantics stay native while
 * the visible control reads as a single connected choice group.
 */
export function SegmentedRadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      {options.map((option) => {
        const id = `${name}-${option.replace(/\s+/g, "-").toLowerCase()}`;
        const checked = value === option;
        return (
          <label
            key={option}
            htmlFor={id}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-2 text-center text-sm font-medium transition-colors",
              checked
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              id={id}
              name={name}
              value={option}
              checked={checked}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}
