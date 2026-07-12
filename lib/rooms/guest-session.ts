/**
 * Frictionless, cookie-based anonymous identity for branch room guests.
 * Deliberately separate from the demo-session system (`lib/demo/demo-session.ts`),
 * which is a dev/testing convenience gated behind `NEXT_PUBLIC_DEMO_AUTH` and
 * shouldn't be relied on in production. This is production guest access for
 * real shoppers visiting a branch's room link. SERVER ONLY (reads cookies).
 */
import { cookies } from "next/headers";
import type { RoomViewer } from "@/lib/rooms/types";

export const GUEST_COOKIE = "tz_room_guest";

function randomGuestId(): string {
  return `guest-${crypto.randomUUID()}`;
}

/** Resolve (not persist — Server Components can't set cookies) a guest viewer. */
export async function getOrCreateGuestViewer(): Promise<RoomViewer> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  const id = existing && existing.startsWith("guest-") ? existing : randomGuestId();
  return {
    id,
    name: `Guest ${id.slice(-4).toUpperCase()}`,
    avatarKey: null,
    genres: [],
    plan: "free",
    accountType: null,
  };
}
