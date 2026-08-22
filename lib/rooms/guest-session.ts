/**
 * Frictionless, cookie-based anonymous identity for branch room guests.
 * Deliberately separate from the demo-session system (`lib/demo/demo-session.ts`),
 * which is a dev/testing convenience gated behind `NEXT_PUBLIC_DEMO_AUTH` and
 * shouldn't be relied on in production. This is production guest access for
 * real shoppers visiting a branch's room link. SERVER ONLY (reads cookies).
 *
 * The actual signing/verification crypto lives in `guest-identity.ts` (pure,
 * import-free, unit-tested) — this file only wires it up to `next/headers`.
 */
import { cookies } from "next/headers";
import type { RoomViewer } from "@/lib/rooms/types";
import {
  GUEST_COOKIE,
  randomGuestId,
  verifyGuestCookieValue,
} from "@/lib/rooms/guest-identity";

export { GUEST_COOKIE };

/** Resolve (not persist — Server Components can't set cookies) a guest viewer. */
export async function getOrCreateGuestViewer(): Promise<RoomViewer> {
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE)?.value;
  const verifiedId = raw ? verifyGuestCookieValue(raw) : null;
  const id = verifiedId ?? randomGuestId();
  return {
    id,
    name: `Guest ${id.slice(-4).toUpperCase()}`,
    avatarKey: null,
    genres: [],
    plan: "free",
    accountType: null,
  };
}
