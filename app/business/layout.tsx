import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Building2, Users } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <aside className="hidden w-56 shrink-0 border-r border-border p-6 sm:block">
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {viewer.businessName}
        </p>
        <nav className="mt-6 space-y-1">
          <Link
            href="/business/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <Link
            href="/business/branches"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Building2 className="size-4" />
            Branches
          </Link>
          {viewer.role !== "manager" && (
            <Link
              href="/business/staff"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Users className="size-4" />
              Staff
            </Link>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  );
}
