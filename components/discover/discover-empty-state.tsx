"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Empty-catalog fallback for /dashboard/discover. Uses the same
 * `fixed inset-0 z-[60] bg-black` full-screen shell (and close-button
 * treatment) as DiscoverFeed, so both branches of the route present as the
 * same kind of full-screen takeover — MobileBottomNav is already hidden on
 * this whole route, so falling back to an in-flow div here would otherwise
 * leave a broken-looking page (nav-sized gap, sticky header still showing)
 * with no way back in.
 */
export function DiscoverEmptyState() {
  const router = useRouter();

  function handleClose() {
    // Same history-depth fallback as DiscoverFeed's close button (see its
    // comment for why the threshold is 2, not 1) — this route can be
    // opened as the very first entry in the session's history (deep link,
    // shared link, PWA shortcut), where router.back() would otherwise
    // dead-end with no in-app way out.
    if (window.history.length > 2) router.back();
    else router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close discovery"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
      >
        <X className="size-5" />
      </button>

      <p className="text-lg font-medium">No mixes to discover yet</p>
      <p className="max-w-xs text-sm text-white/70">
        Check back once the catalog has a few more tracks in it.
      </p>
      <Link href="/dashboard/browse" className="mt-2 text-sm font-semibold underline">
        Back to Browse
      </Link>
    </div>
  );
}
