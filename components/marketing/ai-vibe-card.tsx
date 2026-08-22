import { Check, Sparkles } from "lucide-react";

const EXAMPLE_DESCRIPTION =
  "Busy Nairobi café — upbeat afrobeats and amapiano through the day.";
const EXAMPLE_GENRES = ["Afrobeats", "Amapiano", "Gengetone"];

/**
 * Static, illustrative preview of the AI Vibe Setup flow (the real thing
 * lives on the branch detail page, components/business/ai-vibe-setup.tsx) —
 * for the marketing page only. Not wired to the API.
 */
export function AiVibeCard() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-lift dark:shadow-none dark:ring-1 dark:ring-white/10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
        <Sparkles className="size-3.5" />
        AI vibe setup
      </span>

      <p className="mt-5 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-foreground">
        “{EXAMPLE_DESCRIPTION}”
      </p>

      <p className="mt-5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Suggested genres
      </p>
      <ul className="mt-3 space-y-2">
        {EXAMPLE_GENRES.map((label) => (
          <li
            key={label}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground"
          >
            <Check className="size-4 text-brand" strokeWidth={3} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
