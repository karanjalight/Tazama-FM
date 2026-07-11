import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listBranches } from "@/lib/business/queries";
import { BranchList } from "@/components/business/branch-list";

export const metadata: Metadata = { title: "Branches — Business Dashboard" };

export default async function BranchesPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const allBranches = await listBranches(viewer.businessId);
  const branches =
    viewer.branchIds === "all"
      ? allBranches
      : allBranches.filter((b) => (viewer.branchIds as string[]).includes(b.id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Branches
        </h1>
      </header>
      <BranchList
        branches={branches}
        canCreate={viewer.role === "owner" || viewer.role === "admin"}
      />
    </div>
  );
}
