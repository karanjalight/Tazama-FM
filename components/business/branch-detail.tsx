"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  renameBranch,
  archiveBranch,
  claimDevice,
  playToBranches,
} from "@/app/business/actions";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/lib/business/types";

export function BranchDetail({
  branch,
  canManage,
}: {
  branch: Branch;
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(branch.name);
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === branch.name) return;
    setPending(true);
    const result = await renameBranch({ branchId: branch.id, name: name.trim() });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    const result = await claimDevice({ branchId: branch.id, code: code.trim() });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCode("");
    toast.success("Device paired.");
    router.refresh();
  }

  async function handleArchive() {
    if (!confirm(`Remove ${branch.name}? This can't be undone.`)) return;
    setPending(true);
    const result = await archiveBranch({ branchId: branch.id });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else router.push("/business/branches");
  }

  async function handleTestPlay() {
    setPending(true);
    const result = await playToBranches({
      branchIds: [branch.id],
      track: {
        youtubeId: "dQw4w9WgXcQ",
        title: "Test track",
        artist: null,
        thumbnailUrl: null,
      },
    });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Sent to this branch.");
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleRename} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
        />
        <Button type="submit" disabled={pending || name === branch.name}>
          Save name
        </Button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Device</h2>
        {branch.devicePairedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Paired. Last seen:{" "}
            {branch.deviceLastSeenAt
              ? new Date(branch.deviceLastSeenAt).toLocaleString()
              : "never"}
          </p>
        ) : (
          <form onSubmit={handleClaim} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code shown on the TV"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
            />
            <Button type="submit" disabled={pending || !code.trim()}>
              Pair device
            </Button>
          </form>
        )}
      </section>

      {branch.devicePairedAt && (
        <Button onClick={handleTestPlay} disabled={pending} variant="outline">
          Send a test track to this branch
        </Button>
      )}

      {canManage && (
        <Button onClick={handleArchive} disabled={pending} variant="outline">
          Remove branch
        </Button>
      )}
    </div>
  );
}
