"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { UserCard } from "@/components/people/user-card";
import { searchUsersAction, startDmAction, startGroupAction } from "@/app/dashboard/chats/actions";
import type { UserSummary } from "@/lib/social/discovery";

export function NewConversationDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserSummary[]>([]);
  const [selected, setSelected] = React.useState<UserSummary[]>([]);
  const [groupName, setGroupName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const trimmedQuery = query.trim();
  const active = trimmedQuery.length >= 2;

  React.useEffect(() => {
    // Nothing to fetch for a short/empty query — `visibleResults` below hides
    // any stale results rather than clearing state synchronously here.
    if (!active) return;
    const t = setTimeout(async () => {
      setResults(await searchUsersAction(query));
    }, 250);
    return () => clearTimeout(t);
  }, [query, active]);

  const visibleResults = active ? results : [];

  function toggle(user: UserSummary) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  }

  async function handleStart() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    const res =
      selected.length === 1
        ? await startDmAction(selected[0].id)
        : await startGroupAction(
            selected.map((u) => u.id),
            groupName,
          );
    setBusy(false);
    if (res.ok && res.conversationId) {
      router.push(`/dashboard/chats/${res.conversationId}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">New message</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        />

        {selected.length > 1 && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        )}

        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {visibleResults.map((u) => (
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(u)}
              onKeyDown={(e) => e.key === "Enter" && toggle(u)}
            >
              <UserCard
                id={u.id}
                fullName={u.fullName}
                avatarKey={u.avatarKey}
                disableLink
                className={selected.some((s) => s.id === u.id) ? "border-brand" : undefined}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={selected.length === 0 || busy}
          className="mt-4 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition disabled:opacity-50"
        >
          {selected.length > 1 ? "Start group" : "Message"}
        </button>
      </div>
    </div>
  );
}
