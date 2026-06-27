"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Globe, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/auth/step-indicator";
import { GenrePicker } from "@/components/rooms/genre-picker";
import { PlanPicker } from "@/components/rooms/plan-picker";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { createRoom } from "@/app/rooms/actions";
import { slugify } from "@/lib/rooms/slug";
import { startCheckout } from "@/lib/billing/checkout-client";
import type { SubscriptionPlan } from "@/lib/billing/plans";
import type { RoomAccess } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

export function CreateRoomDialog({
  open,
  onOpenChange,
  accountType,
  currentPlan,
  origin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountType: "individual" | "business" | null;
  currentPlan: SubscriptionPlan;
  origin: string;
}) {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = React.useState<Step>(1);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState("");
  const [about, setAbout] = React.useState("");
  const [access, setAccess] = React.useState<RoomAccess>("public");
  const [genres, setGenres] = React.useState<string[]>([]);
  const [plan, setPlan] = React.useState<SubscriptionPlan>(currentPlan);
  const [error, setError] = React.useState("");

  const slug = slugify(name) || "your-hangout";

  // Reset to a clean slate whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setAbout("");
      setAccess("public");
      setGenres([]);
      setPlan(currentPlan);
      setError("");
    }
  }, [open, currentPlan]);

  function next() {
    setError("");
    if (step === 1 && name.trim().length < 2) {
      setError("Give your hangout a name.");
      return;
    }
    if (step === 3 && genres.length === 0) {
      setError("Pick at least one genre.");
      return;
    }
    setStep((s) => Math.min(4, s + 1) as Step);
  }

  function back() {
    setError("");
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  async function finish() {
    setSubmitting(true);
    setError("");
    const res = await createRoom({ name, about, access, genres });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error);
      toast.error(res.error);
      return;
    }

    const upgrading = plan !== "free" && plan !== currentPlan;
    if (upgrading) {
      // Account-level subscription — unlock all rooms. Pay, then land in the room.
      const err = await startCheckout(plan, {
        callbackPath: `/rooms/${res.slug}`,
      });
      if (err) {
        // Checkout couldn't start; still drop them into their (free) room.
        toast.message("Couldn't start checkout — you're in preview for now.", {
          description: err,
        });
        onOpenChange(false);
        router.push(`/rooms/${res.slug}`);
        return;
      }
      return; // browser is navigating to Paystack
    }

    toast.success("Your hangout is live 🎧");
    onOpenChange(false);
    router.push(`/rooms/${res.slug}`);
  }

  const slide = (dir: 1 | -1) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x: 24 * dir },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -24 * dir },
          transition: { duration: 0.26, ease: "easeOut" as const },
        };

  const TITLES: Record<Step, string> = {
    1: "What's the vibe?",
    2: "Who's rolling in?",
    3: "What's playing in the booth?",
    4: "Upgrade your hangout",
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[92svh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-dark transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="space-y-1.5 px-6 pt-6">
            <StepIndicator step={step} total={4} />
            <Dialog.Title className="pt-2 text-xl font-semibold tracking-tight text-foreground">
              {TITLES[step]}
            </Dialog.Title>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 && (
                <motion.div key="s1" {...slide(1)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="room-name">Name</Label>
                    <Input
                      id="room-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Friday Night Amapiano"
                      autoFocus
                      maxLength={60}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Hangout URL</Label>
                    <div className="truncate rounded-xl border border-dashed border-border bg-muted/50 px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
                      {origin.replace(/^https?:\/\//, "")}/rooms/
                      <span className="text-foreground">{slug}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="room-about">About this hangout</Label>
                    <Textarea
                      id="room-about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="What's the mood? Who's it for?"
                      maxLength={280}
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" {...slide(1)} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Who can come into this hangout?
                  </p>
                  <AccessOption
                    icon={<Globe className="size-4.5" />}
                    title="Public"
                    description="Anyone can join the hangout"
                    selected={access === "public"}
                    onSelect={() => setAccess("public")}
                  />
                  <AccessOption
                    icon={<Lock className="size-4.5" />}
                    title="Private"
                    description="Only people you invite can join"
                    selected={access === "private"}
                    onSelect={() => setAccess("private")}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" {...slide(1)}>
                  <GenrePicker value={genres} onChange={setGenres} />
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="s4" {...slide(1)} className="space-y-4">
                  <div className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Upgrade to unlock unlimited listening time across all your
                      hangouts. Preview hangouts are limited to 2 hours of total
                      listening time.
                    </p>
                  </div>
                  <PlanPicker
                    accountType={accountType}
                    currentPlan={currentPlan}
                    value={plan}
                    onChange={setPlan}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-border px-6 py-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-xl"
                onClick={back}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : (
              <Dialog.Close
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="rounded-xl"
                  />
                }
              >
                Cancel
              </Dialog.Close>
            )}

            <div className="flex-1" />

            {step < 4 ? (
              <Button
                type="button"
                variant="brand"
                size="lg"
                className="rounded-xl px-6"
                onClick={next}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                variant="brand"
                size="lg"
                className="rounded-xl px-6"
                onClick={finish}
                disabled={submitting}
              >
                {submitting
                  ? "Starting…"
                  : plan !== "free" && plan !== currentPlan
                    ? "Upgrade & start"
                    : "Start the hangout"}
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccessOption({
  icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:border-foreground/30",
        selected
          ? "border-brand bg-brand/[0.04] ring-1 ring-brand"
          : "border-border bg-background",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl transition-colors",
          selected ? "bg-brand text-white" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
