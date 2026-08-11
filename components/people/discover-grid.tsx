import { DiscoverCard } from "@/components/people/discover-card";
import type { SuggestedUser } from "@/lib/social/discovery";

/** Desktop discovery layout — a responsive grid of DiscoverCard tiles. Hidden
 * on mobile, where DiscoverFeedMobile's one-at-a-time feed takes over. */
export function DiscoverGrid({ suggestions }: { suggestions: SuggestedUser[] }) {
  return (
    <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 md:grid">
      {suggestions.map((user) => (
        <DiscoverCard key={user.id} user={user} />
      ))}
    </div>
  );
}
