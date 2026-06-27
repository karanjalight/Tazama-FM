"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { Field } from "./field";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show a strength meter (used on signup, not login). */
  showStrength?: boolean;
}

function strength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(score, 3);
  return { score: clamped, label: ["Weak", "Weak", "Good", "Strong"][clamped] };
}

const BAR_COLOR = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-live"];

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete = "current-password",
  placeholder,
  disabled,
  showStrength,
}: PasswordFieldProps) {
  const [show, setShow] = React.useState(false);
  const meter = strength(value);

  return (
    <div className="space-y-1.5">
      <Field
        id={id}
        label={label}
        type={show ? "text" : "password"}
        value={value}
        onValueChange={onChange}
        error={error}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        icon={<Lock />}
        trailing={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {show ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        }
      />

      {showStrength && value.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < meter.score ? BAR_COLOR[meter.score] : "bg-border",
                )}
              />
            ))}
          </div>
          <span className="w-10 text-right text-xs text-muted-foreground">
            {meter.label}
          </span>
        </div>
      )}
    </div>
  );
}
