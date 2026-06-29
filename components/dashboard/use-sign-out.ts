"use client";

import * as React from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { DEMO_AUTH, endDemoSession } from "@/lib/demo/demo-session";
import { navigateAfterAuth } from "@/lib/auth/navigate";

/** Shared sign-out: ends the demo session (if any) + the Supabase session. */
export function useSignOut() {
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = React.useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    if (DEMO_AUTH) endDemoSession();
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out — see you soon.");
    // Hard navigation so proxy.ts re-runs with the cleared cookie and the
    // Router Cache doesn't replay a stale authed view. See navigateAfterAuth.
    navigateAfterAuth("/login");
  }, [signingOut]);

  return { signOut, signingOut };
}
