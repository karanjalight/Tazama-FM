/**
 * Who a Pair with a Screen guest is: a signed-in account or a signed guest
 * cookie (`lib/rooms/guest-session.ts`, reused as-is), plus the display name
 * they chose when pairing. SERVER ONLY (reads cookies).
 */
import { cookies } from "next/headers";

import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
import { GUEST_COOKIE, verifyGuestCookieValue } from "@/lib/rooms/guest-identity";
import { cleanDisplayName } from "@/lib/pair/request-rules";
import type { RoomViewer } from "@/lib/rooms/types";

export const PAIR_NAME_COOKIE = "tz_pair_name";

export interface PairViewer {
  viewer: RoomViewer;
  /** True until the pairing step has run on this phone: no chosen name yet,
   * or (for a guest) no persisted identity cookie — without one, every
   * request would get a fresh random guest id and could never be removed. */
  needsPair: boolean;
  suggestedName: string;
}

export async function getPairViewer(): Promise<PairViewer> {
  const store = await cookies();
  const pairedName = cleanDisplayName(store.get(PAIR_NAME_COOKIE)?.value ?? "");

  const account = await getRoomViewer();
  if (account) {
    return {
      viewer: { ...account, name: pairedName ?? account.name },
      needsPair: !pairedName,
      suggestedName: pairedName ?? account.name,
    };
  }

  const raw = store.get(GUEST_COOKIE)?.value;
  const hasGuestIdentity = !!raw && !!verifyGuestCookieValue(raw);
  const guest = await getOrCreateGuestViewer();
  return {
    viewer: { ...guest, name: pairedName ?? guest.name },
    needsPair: !pairedName || !hasGuestIdentity,
    suggestedName: pairedName ?? "",
  };
}

/** The actor for a Pair server action, or null if this phone hasn't paired. */
export async function resolvePairActor(): Promise<{ id: string; name: string } | null> {
  const { viewer, needsPair } = await getPairViewer();
  return needsPair ? null : { id: viewer.id, name: viewer.name };
}
