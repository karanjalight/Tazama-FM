"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
};

/** Labelled text input with an optional leading icon, hint and error message. */
export function Field({
  id,
  label,
  error,
  hint,
  optional,
  icon,
  trailing,
  className,
  wrapperClassName,
  ...inputProps
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(icon && "pl-10", trailing && "pr-11", className)}
          {...inputProps}
        />
        {trailing && (
          <span className="absolute top-1/2 right-1.5 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
