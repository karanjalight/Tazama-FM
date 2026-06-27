"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * A polished single-value dropdown over Base UI's Select primitive.
 * Styled to match `Input`. Used for the business "industry" field.
 */
function Select({
  id,
  value,
  onValueChange,
  items,
  placeholder = "Select…",
  invalid,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(v) => onValueChange(v as string)}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3.5 text-[15px] text-foreground shadow-sm transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[popup-open]:border-ring",
          "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
          className,
        )}
      >
        <SelectPrimitive.Value
          placeholder={
            <span className="text-muted-foreground/70">{placeholder}</span>
          }
        />
        <SelectPrimitive.Icon className="text-muted-foreground">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <SelectPrimitive.Popup
            className={cn(
              "max-h-72 w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift",
              "origin-[var(--transform-origin)] transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
            )}
          >
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item}
                value={item}
                className={cn(
                  "flex cursor-default items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none",
                  "data-highlighted:bg-muted data-selected:font-medium",
                )}
              >
                <SelectPrimitive.ItemText>{item}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4 text-brand" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
