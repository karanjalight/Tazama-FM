"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AI_PREMIUM_USD } from "@/lib/billing/ai";

const PREMIUM_PRICE = AI_PREMIUM_USD;

const PERKS = [
  "AI concierge chat for recommendations",
  "Taste-matched tracks you can play instantly",
  "Save & replay AI-built playlists",
];

interface PremiumContextValue {
  /** Whether the signed-in user currently has AI premium. */
  active: boolean;
  /** True until the first status fetch resolves. */
  loading: boolean;
  /** Re-fetch premium status (e.g. after returning from checkout). */
  refresh: () => Promise<void>;
  /** Open the upgrade sheet directly. */
  openUpgrade: () => void;
  /**
   * Inspect a fetch Response: if it's a 402 (premium_required), open the upgrade
   * sheet and return true so the caller can bail out of handling the body.
   */
  handlePaywall: (res: Response) => boolean;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

/** Access premium state + the upgrade flow. Must be used inside <PremiumGate>. */
export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used within <PremiumGate>.");
  }
  return ctx;
}

/**
 * Wraps any subtree that uses AI features. Tracks the user's premium status and
 * renders the upgrade sheet, which it pops open whenever an AI request returns
 * 402 (via handlePaywall) or when openUpgrade() is called.
 */
export function PremiumGate({
  children,
  initialActive = false,
}: {
  children: ReactNode;
  initialActive?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(!initialActive);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/premium", { cache: "no-store" });
      const data = (await res.json()) as { active?: boolean };
      setActive(!!data.active);
    } catch {
      // Network hiccup — keep the last known state, just stop the spinner.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial status load. Inlined (rather than calling refresh) with a cancel
  // guard so a fast unmount can't set state on a gone component.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/premium", { cache: "no-store" });
        const data = (await res.json()) as { active?: boolean };
        if (!cancelled) setActive(!!data.active);
      } catch {
        // Network hiccup — keep the last known state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openUpgrade = useCallback(() => setOpen(true), []);

  const handlePaywall = useCallback((res: Response) => {
    if (res.status === 402) {
      setOpen(true);
      return true;
    }
    return false;
  }, []);

  return (
    <PremiumContext.Provider
      value={{ active, loading, refresh, openUpgrade, handlePaywall }}
    >
      {children}
      <UpgradeSheet open={open} onOpenChange={setOpen} />
    </PremiumContext.Provider>
  );
}

function UpgradeSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [starting, setStarting] = useState(false);

  async function onUpgrade() {
    setStarting(true);
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callbackPath: window.location.pathname + window.location.search,
        }),
      });
      const data = (await res.json()) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl; // off to Paystack
        return;
      }
      toast.error(data.error ?? "Couldn't start checkout.");
    } catch {
      toast.error("Couldn't reach the billing service.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-lg flex-col"
        >
          <SheetHeader className="gap-2 p-6 pb-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand uppercase">
              <Sparkles className="size-3" strokeWidth={2.5} />
              Tazama AI
            </span>
            <SheetTitle className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Unlock your music concierge
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Chat for recommendations, get taste-matched tracks you can play in
              the room instantly, and save the playlists it builds.
            </SheetDescription>
          </SheetHeader>

          <div className="px-6">
            <div className="flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-tight text-foreground">
                ${PREMIUM_PRICE}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">/ month</span>
            </div>

            <ul className="mt-4 space-y-2.5">
              {PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-2.5 text-sm text-foreground"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <SheetFooter className="gap-2 p-6 pt-5">
            <Button
              variant="brand"
              size="xl"
              className="w-full"
              disabled={starting}
              onClick={onUpgrade}
            >
              {starting
                ? "Starting checkout…"
                : `Upgrade for $${PREMIUM_PRICE}/mo`}
            </Button>
            <SheetClose
              render={<Button variant="ghost" size="lg" className="w-full" />}
            >
              Maybe later
            </SheetClose>
          </SheetFooter>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
