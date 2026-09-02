/**
 * Resolves who's acting on a zone-room (suggesting a track, liking one) —
 * a real/demo signed-in viewer, else a guest. `getRoomViewer()`/
 * `getOrCreateGuestViewer()` (`lib/rooms/viewer.ts`, `lib/rooms/guest-
 * session.ts`) are already fully generic — reused as-is, not forked. Unlike
 * Rooms' own `resolveActor(roomId)` (`app/rooms/actions.ts`), there's no
 * per-target ownership check before falling back to a guest: every Audio
 * Zone is business-owned by construction, so guest access is unconditional
 * here (the Rooms version only allows it for branch-owned rooms specifically
 * because a *personal* room must stay real-auth-only). SERVER ONLY.
 */
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";

export async function resolveZoneActor(): Promise<{ id: string; name: string } | null> {
  const viewer = await getRoomViewer();
  if (viewer) return { id: viewer.id, name: viewer.name };
  const guest = await getOrCreateGuestViewer();
  return { id: guest.id, name: guest.name };
}
