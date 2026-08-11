"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";

import { notificationPermissionState } from "@/lib/voice/capabilities";

const DISMISSED_KEY = "tz.voice.notif-prompt-dismissed";

/**
 * A one-time, dismissible opt-in for chat notifications — never
 * auto-requests permission (that's a hard requirement: requesting on page
 * load without a user gesture gets browsers to auto-deny future prompts).
 * Shown only when permission is still in its default ("never asked") state.
 */
export function NotificationPermissionPrompt() {
  // Lazy init (no setState-in-effect): SSR and the first client render both
  // return false — window is undefined on the server.
  const [visible, setVisible] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    return !dismissed && notificationPermissionState() === "default";
  });
  const [requesting, setRequesting] = React.useState(false);

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function enable() {
    setRequesting(true);
    try {
      await Notification.requestPermission();
    } finally {
      setRequesting(false);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-background p-3 shadow-soft">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <Bell className="size-4" />
      </span>
      <p className="flex-1 text-xs text-muted-foreground">
        Get notified about new messages and voice notes when Tazama&rsquo;s in the background.
      </p>
      <button
        type="button"
        onClick={enable}
        disabled={requesting}
        className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
      >
        Enable
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
