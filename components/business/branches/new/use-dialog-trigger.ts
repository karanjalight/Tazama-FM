"use client";

import * as React from "react";

/**
 * Open state for a create-modal, paired with a remount key. Bumping the key
 * on every `show()` forces the dialog's form fields to reset by remounting
 * rather than via a `useEffect(() => setState(...), [open])` — React's own
 * guidance for "reset state when reopened" (avoids the set-state-in-effect
 * cascading-render footgun).
 */
export function useDialogTrigger() {
  const [open, setOpen] = React.useState(false);
  const [dialogKey, setDialogKey] = React.useState(0);

  const show = React.useCallback(() => {
    setDialogKey((k) => k + 1);
    setOpen(true);
  }, []);

  return { open, dialogKey, show, onOpenChange: setOpen };
}
