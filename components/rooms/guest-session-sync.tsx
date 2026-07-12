"use client";

import * as React from "react";
import { ensureGuestCookie } from "@/lib/rooms/guest-actions";

/** Persists a guest's id (resolved server-side) into a cookie on first mount —
 * Server Components can resolve a guest viewer but can't set cookies during
 * render, so this tiny client component does it via a Server Action instead. */
export function GuestSessionSync({ id }: { id: string }) {
  React.useEffect(() => {
    void ensureGuestCookie(id);
  }, [id]);
  return null;
}
