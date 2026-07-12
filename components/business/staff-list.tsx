"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  inviteStaff,
  updateStaffBranches,
  revokeStaff,
} from "@/app/business/actions";
import { Button } from "@/components/ui/button";
import type { Branch, StaffMember } from "@/lib/business/types";

export function StaffList({
  staff,
  branches,
}: {
  staff: StaffMember[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "manager">("manager");
  const [pending, setPending] = React.useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    const result = await inviteStaff({ email: email.trim(), role });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function handleBranchToggle(
    staffId: string,
    branchId: string,
    current: string[],
  ) {
    const next = current.includes(branchId)
      ? current.filter((id) => id !== branchId)
      : [...current, branchId];
    setPending(true);
    const result = await updateStaffBranches({ staffId, branchIds: next });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function handleRevoke(staffId: string) {
    if (!confirm("Remove this staff member?")) return;
    setPending(true);
    const result = await revokeStaff({ staffId });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@business.com"
          type="email"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "manager")}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" disabled={pending || !email.trim()}>
          Invite
        </Button>
      </form>

      <div className="space-y-3">
        {staff.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{s.email}</p>
                <p className="text-xs text-muted-foreground">
                  {s.role} · {s.acceptedAt ? "active" : "invited (pending)"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(s.id)}
                disabled={pending}
              >
                Remove
              </Button>
            </div>
            {s.role === "manager" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={s.branchIds.includes(b.id)}
                      onChange={() =>
                        handleBranchToggle(s.id, b.id, s.branchIds)
                      }
                      disabled={pending}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        {!staff.length && (
          <p className="text-sm text-muted-foreground">
            No staff invited yet.
          </p>
        )}
      </div>
    </div>
  );
}
