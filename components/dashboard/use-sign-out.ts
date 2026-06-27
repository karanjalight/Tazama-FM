"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { DEMO_AUTH, endDemoSession } from "@/lib/demo/demo-session";

/** Shared sign-out: ends the demo session (if any) + the Supabase session. */
export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = React.useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    if (DEMO_AUTH) endDemoSession();
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out — see you soon.");
    router.push("/login");
    router.refresh();
  }, [signingOut, router]);

  return { signOut, signingOut };
}
