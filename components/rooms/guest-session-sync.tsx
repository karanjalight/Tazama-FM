"use client";

import * as React from "react";
import { ensureGuestCookie } from "@/lib/rooms/guest-actions";

/** Persists a guest identity cookie on first mount — Server Components can
 * resolve a guest viewer but can't set cookies during render, so this tiny
 * client component does it via a Server Action instead. Takes no props: the
 * Server Action derives/mints the identity itself server-side (never from a
 * client-supplied value — see the doc comment on `ensureGuestCookie`). */
export function GuestSessionSync() {
  React.useEffect(() => {
    void ensureGuestCookie();
  }, []);
  return null;
}
