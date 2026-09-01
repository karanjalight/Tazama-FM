"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Sticky bar shown while a settings form has unsaved edits. Purely a local
 * dirty-state affordance — persistence is the caller's mock `onSave`.
 */
export function SaveBar({
  dirty,
  saving = false,
  onDiscard,
  onSave,
  message = "You have unsaved changes.",
}: {
  dirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  message?: string;
}) {
  if (!dirty) return null;

  return (
    <div
      role="status"
      className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-popover/95 p-4 shadow-lift backdrop-blur-md"
    >
      <p className="text-sm font-medium text-foreground">{message}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button type="button" variant="brand" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
