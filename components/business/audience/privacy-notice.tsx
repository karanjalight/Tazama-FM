import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-400" />
      <div>
        <p className="text-sm font-medium text-foreground">Privacy-conscious insights</p>
        <p className="text-sm text-muted-foreground">
          Audience Insights uses aggregate activity signals. No individual customer identities are displayed.
        </p>
      </div>
    </div>
  );
}
