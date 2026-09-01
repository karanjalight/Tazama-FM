import { Plus, Puzzle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shown in place of the "Connected" strip when nothing is connected —
 * matches the dashed-border placeholder convention in
 * components/business/branches/location-detail-panel.tsx.
 */
export function EmptyIntegrationsState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
        <Puzzle className="size-4" />
      </span>
      <p className="text-sm font-medium text-foreground">No integrations connected</p>
      <p className="max-w-64 text-xs text-muted-foreground">
        Connect your first integration to extend Tazama&apos;s capabilities.
      </p>
      <Button type="button" variant="brand" size="sm" className="mt-2 gap-1.5" onClick={onConnect}>
        <Plus className="size-3.5" />
        Connect Integration
      </Button>
    </div>
  );
}
