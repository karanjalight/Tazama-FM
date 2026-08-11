import { BADGE_META } from "@/lib/gamification/rules";

export function BadgeRow({ badgeKeys }: { badgeKeys: string[] }) {
  if (badgeKeys.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badgeKeys.map((key) => {
        const meta = BADGE_META[key];
        if (!meta) return null;
        return (
          <span
            key={key}
            title={meta.description}
            className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
