"use client";

import * as React from "react";

/**
 * Open state for a create-modal, paired with a remount key. Bumping the key
 * on every `show()` forces the dialog's form fields to reset by remounting
 * rather than via a `useEffect(() => setState(...), [open])` — React's own
 * guidance for "reset state when reopened" (avoids the set-state-in-effect
 * cascading-render footgun).
 *
 * `name` must be unique among the other useDialogTrigger() calls rendered
 * as siblings under the same parent (e.g. a step with both a zone and a
 * room dialog) — two independent counters both starting at 0 would
 * otherwise collide as duplicate React keys once each had been opened the
 * same number of times.
 */
export function useDialogTrigger(name: string) {
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(0);

  const show = React.useCallback(() => {
    setCount((c) => c + 1);
    setOpen(true);
  }, []);

  return { open, dialogKey: `${name}-${count}`, show, onOpenChange: setOpen };
}
