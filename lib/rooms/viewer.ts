/**
 * The "room viewer" — the current actor (real Supabase user OR demo session),
 * resolved to everything a room needs: identity, taste, and plan. SERVER ONLY.
 *
 * Rooms persist via the service-role client (see `queries.ts` / `actions.ts`)
 * and store the actor id as a plain uuid (no FK to profiles/auth.users), so this
 * works in demo mode too — the demo session's id and name are all we need.
 */
import { getCurrentProfile, firstName } from "@/lib/auth/profile";
import { getPlanForAccount } from "@/lib/billing/subscription";
import type { RoomViewer } from "@/lib/rooms/types";

/** Resolve the current viewer, or null when nobody is signed in. */
export async function getRoomViewer(): Promise<RoomViewer | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const name =
    profile.accountType === "business"
      ? (profile.business?.businessName ?? profile.fullName)
      : firstName(profile.fullName);

  const plan = await getPlanForAccount(profile.id);

  return {
    id: profile.id,
    name: name || "Guest",
    avatarKey: profile.avatarKey,
    genres: profile.genrePreferences ?? [],
    plan,
    accountType: profile.accountType,
  };
}
