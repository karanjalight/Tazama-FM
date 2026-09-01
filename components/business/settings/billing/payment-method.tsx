"use client";

import * as React from "react";
import { toast } from "sonner";
import { CreditCard, Landmark, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentMethodState, PaymentMethodType } from "./mock-data";

const METHOD_OPTIONS: { type: PaymentMethodType; label: string; icon: typeof CreditCard }[] = [
  { type: "card", label: "Card", icon: CreditCard },
  { type: "mpesa", label: "M-Pesa", icon: Smartphone },
  { type: "bank", label: "Bank", icon: Landmark },
];

export function PaymentMethod({
  method,
  onChange,
}: {
  method: PaymentMethodState;
  onChange: (method: PaymentMethodState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<PaymentMethodType>("card");
  const [cardNumber, setCardNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");

  function handleOpenChange() {
    setType("card");
    setCardNumber("");
    setExpiry("");
    setOpen(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            <CreditCard className="size-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Payment Method</h2>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-sm text-foreground">{method.label}</p>
              <span className="text-muted-foreground">·</span>
              <p className="text-xs text-muted-foreground">Expires {method.expiry}</p>
              {method.isPrimary && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Primary
                </span>
              )}
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={handleOpenChange}>
          Change
        </Button>
      </div>

      <ChangePaymentDialog
        open={open}
        onOpenChange={setOpen}
        type={type}
        onTypeChange={setType}
        cardNumber={cardNumber}
        onCardNumberChange={setCardNumber}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onSave={onChange}
      />
    </div>
  );
}

function ChangePaymentDialog({
  open,
  onOpenChange,
  type,
  onTypeChange,
  cardNumber,
  onCardNumberChange,
  expiry,
  onExpiryChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaymentMethodType;
  onTypeChange: (type: PaymentMethodType) => void;
  cardNumber: string;
  onCardNumberChange: (value: string) => void;
  expiry: string;
  onExpiryChange: (value: string) => void;
  onSave: (method: PaymentMethodState) => void;
}) {
  const canSave = type === "card" && cardNumber.trim().length > 0 && expiry.trim().length > 0;

  function detectBrand(number: string): string {
    const digit = number.trim()[0];
    if (digit === "4") return "Visa";
    if (digit === "5") return "Mastercard";
    return "Card";
  }

  function handleSave() {
    if (!canSave) return;
    const last4 = cardNumber.replace(/\D/g, "").slice(-4).padStart(4, "•");
    onSave({
      type: "card",
      label: `${detectBrand(cardNumber)} •••• ${last4}`,
      expiry: expiry.trim(),
      isPrimary: true,
    });
    toast.success("Payment method updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Payment Method</DialogTitle>
          <DialogDescription>Choose how you&apos;d like to pay for your subscription.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {METHOD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = type === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => onTypeChange(option.type)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  active
                    ? "border-brand bg-brand/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        {type === "card" ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-card-number">Card Number</Label>
              <Input
                id="pm-card-number"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => onCardNumberChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-card-expiry">Expiry</Label>
              <Input
                id="pm-card-expiry"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => onExpiryChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-muted p-3.5 text-sm text-muted-foreground">
            {type === "mpesa" ? "M-Pesa" : "Bank transfer"} payments are coming soon.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
