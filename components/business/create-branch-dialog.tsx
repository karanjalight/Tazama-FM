"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/auth/step-indicator";
import { GenrePicker } from "@/components/rooms/genre-picker";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { createBranch } from "@/app/business/actions";

type Step = 1 | 2;

const TITLES: Record<Step, string> = {
  1: "Name your branch",
  2: "What should it play?",
};

export function CreateBranchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = React.useState<Step>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [genres, setGenres] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");

  function reset() {
    setStep(1);
    setName("");
    setGenres([]);
    setError("");
  }

  function next() {
    setError("");
    if (step === 1 && name.trim().length < 2) {
      setError("Give the branch a name.");
      return;
    }
    setStep((s) => Math.min(2, s + 1) as Step);
  }

  function back() {
    setError("");
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  async function finish() {
    if (genres.length === 0) {
      setError("Pick at least one genre.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await createBranch({ name: name.trim(), genres });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Branch created.");
    onOpenChange(false);
    reset();
    router.refresh();
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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[92svh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-dark transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="space-y-1.5 px-6 pt-6">
            <StepIndicator step={step} total={2} />
            <Dialog.Title className="pt-2 text-xl font-semibold tracking-tight text-foreground">
              {TITLES[step]}
            </Dialog.Title>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 && (
                <motion.div key="s1" {...slide(1)} className="space-y-1.5">
                  <Label htmlFor="branch-name">Name</Label>
                  <Input
                    id="branch-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Westlands"
                    autoFocus
                    maxLength={60}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" {...slide(1)}>
                  <GenrePicker value={genres} onChange={setGenres} />
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

            {step < 2 ? (
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
                {submitting ? "Creating…" : "Create branch"}
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
