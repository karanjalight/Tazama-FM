/**
 * The "room viewer" — the current actor (real Supabase user OR demo session),
 * resolved to everything a room needs: identity, taste, and plan. SERVER ONLY.
 *
 * Rooms persist via the service-role client (see `queries.ts` / `actions.ts`),
 * so this works in demo mode too; `ensureProfile` backfills a profiles row for
 * demo users so the room foreign keys hold.
 */
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Make sure a `profiles` row exists for the viewer so room FKs hold. No-op for
 * real users (their row already exists); backfills demo users. Returns false
 * when the catalog can't be reached (service-role key missing).
 */
export async function ensureProfile(viewer: RoomViewer): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: viewer.id, full_name: viewer.name },
      { onConflict: "id", ignoreDuplicates: true },
    );
  return !error;
}
