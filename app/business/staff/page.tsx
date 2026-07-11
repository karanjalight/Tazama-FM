import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listStaff, listBranches } from "@/lib/business/queries";
import { StaffList } from "@/components/business/staff-list";

export const metadata: Metadata = { title: "Staff — Business Dashboard" };

export default async function StaffPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");
  if (viewer.role === "manager") redirect("/business/dashboard");

  const [staff, branches] = await Promise.all([
    listStaff(viewer.businessId),
    listBranches(viewer.businessId),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Staff
        </h1>
      </header>
      <StaffList staff={staff} branches={branches} />
    </div>
  );
}
