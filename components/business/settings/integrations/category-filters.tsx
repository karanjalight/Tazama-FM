"use client";

import { cn } from "@/lib/utils";
import { FILTER_CATEGORIES, type FilterCategory } from "./mock-data";

/**
 * Underline-style tab bar, matching the convention in
 * components/business/branches/location-detail-panel.tsx. Scrolls
 * horizontally on narrow screens with an edge fade instead of wrapping.
 */
export function CategoryFilters({
  active,
  onChange,
}: {
  active: FilterCategory;
  onChange: (category: FilterCategory) => void;
}) {
  return (
    <div className="mask-fade-x -mx-1 px-1">
      <div
        role="tablist"
        aria-label="Integration categories"
        className="no-scrollbar flex w-max min-w-full gap-1 overflow-x-auto border-b border-border"
      >
        {FILTER_CATEGORIES.map((category) => {
          const isActive = category === active;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              id={`integrations-tab-${category}`}
              aria-selected={isActive}
              aria-controls="integrations-panel"
              onClick={() => onChange(category)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
