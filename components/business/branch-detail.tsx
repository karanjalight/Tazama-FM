"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  renameBranch,
  archiveBranch,
  claimDevice,
  forgetDevice,
  createBranchManager,
  updateBranchGenres,
} from "@/app/business/actions";
import { Button } from "@/components/ui/button";
import { GenrePicker } from "@/components/rooms/genre-picker";
import type { Branch, BranchDevice } from "@/lib/business/types";

export function BranchDetail({
  branch,
  genres: initialGenres,
  devices: initialDevices,
  canManage,
}: {
  branch: Branch;
  genres: string[];
  devices: BranchDevice[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(branch.name);
  const [genres, setGenres] = React.useState(initialGenres);
  const [devices, setDevices] = React.useState(initialDevices);
  const [code, setCode] = React.useState("");
  const [deviceName, setDeviceName] = React.useState("");
  const [managerEmail, setManagerEmail] = React.useState("");
  const [managerPhone, setManagerPhone] = React.useState("");
  const [managerPassword, setManagerPassword] = React.useState("");
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

  async function handleSaveGenres() {
    setPending(true);
    const result = await updateBranchGenres({ branchId: branch.id, genres });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Genres updated.");
      router.refresh();
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !deviceName.trim()) return;
    setPending(true);
    const result = await claimDevice({
      branchId: branch.id,
      code: code.trim(),
      name: deviceName.trim(),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCode("");
    setDeviceName("");
    toast.success("Device paired.");
    router.refresh();
  }

  async function handleForget(deviceId: string) {
    if (!confirm("Forget this device? It will need a new pairing code.")) return;
    setDevices((d) => d.filter((x) => x.id !== deviceId));
    const result = await forgetDevice({ branchId: branch.id, deviceId });
    if (!result.ok) toast.error(result.error);
  }

  async function handleArchive() {
    if (!confirm(`Remove ${branch.name}? This can't be undone.`)) return;
    setPending(true);
    const result = await archiveBranch({ branchId: branch.id });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else router.push("/business/branches");
  }

  async function handleCreateManager(e: React.FormEvent) {
    e.preventDefault();
    if (!managerEmail.trim() || !managerPhone.trim() || !managerPassword) return;
    setPending(true);
    const result = await createBranchManager({
      branchId: branch.id,
      email: managerEmail.trim(),
      phone: managerPhone.trim(),
      password: managerPassword,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setManagerEmail("");
    setManagerPhone("");
    setManagerPassword("");
    toast.success("Manager account created.");
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleRename} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
        />
        {canManage && (
          <Button type="submit" disabled={pending || name === branch.name}>
            Save name
          </Button>
        )}
      </form>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          What this branch plays
        </h2>
        <div className="mt-3">
          <GenrePicker value={genres} onChange={setGenres} />
        </div>
        <Button
          onClick={handleSaveGenres}
          disabled={pending}
          className="mt-3"
          size="sm"
        >
          Save genres
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        {devices.length > 0 && (
          <ul className="mt-3 space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.online ? "Online" : "Offline"} · Last seen:{" "}
                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "never"}
                  </p>
                </div>
                <Button
                  onClick={() => handleForget(d.id)}
                  variant="outline"
                  size="sm"
                >
                  Forget
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleClaim} className="mt-3 flex flex-wrap gap-2">
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device name (e.g. Main TV)"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Pairing code from the TV"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
          />
          <Button type="submit" disabled={pending || !code.trim() || !deviceName.trim()}>
            Pair a device
          </Button>
        </form>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Add a manager for this branch
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Creates a working account right away — they can sign in with this
            email and password immediately, scoped to this branch.
          </p>
          <form onSubmit={handleCreateManager} className="mt-3 space-y-2">
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="Email"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
              placeholder="Phone number"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              placeholder="Password (min. 8 characters)"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <Button
              type="submit"
              disabled={
                pending || !managerEmail.trim() || !managerPhone.trim() || !managerPassword
              }
            >
              Create manager account
            </Button>
          </form>
        </section>
      )}

      {canManage && (
        <Button onClick={handleArchive} disabled={pending} variant="outline">
          Remove branch
        </Button>
      )}
    </div>
  );
}
