"use client";

import { Download, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INVOICES, type Invoice } from "./mock-data";

function StatusPill({ status }: { status: Invoice["status"] }) {
  const paid = status === "paid";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        paid ? "text-emerald-400" : "text-rose-400",
      )}
    >
      <span className={cn("size-1.5 rounded-full", paid ? "bg-emerald-500" : "bg-rose-500")} />
      {paid ? "Paid" : "Failed"}
    </span>
  );
}

function handleView(invoice: Invoice) {
  toast.success(`Invoice opened for ${invoice.date}`);
}

function handleDownload() {
  toast.success("Invoice downloaded");
}

function RowActions({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`View invoice from ${invoice.date}`}
        onClick={() => handleView(invoice)}
        className="text-muted-foreground"
      >
        <Eye className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Download invoice from ${invoice.date}`}
        onClick={handleDownload}
        className="text-muted-foreground"
      >
        <Download className="size-4" />
      </Button>
    </div>
  );
}

export function BillingHistory() {
  return (
    <div id="billing-history" className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground">Billing History</h2>
      </div>

      {/* Table — sm and up */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-foreground">{invoice.date}</td>
                <td className="px-4 py-3 text-muted-foreground">{invoice.description}</td>
                <td className="px-4 py-3 text-foreground">{invoice.amount}</td>
                <td className="px-4 py-3">
                  <StatusPill status={invoice.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <RowActions invoice={invoice} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below sm */}
      <div className="divide-y divide-border sm:hidden">
        {INVOICES.map((invoice) => (
          <div key={invoice.id} className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{invoice.description}</p>
              <StatusPill status={invoice.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{invoice.date}</span>
              <span className="text-sm font-medium text-foreground">{invoice.amount}</span>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <RowActions invoice={invoice} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
