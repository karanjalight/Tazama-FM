import { redirect } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BusinessSidebarNav } from "@/components/business/business-sidebar-nav";
import { getBusinessViewer } from "@/lib/business/viewer";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
};

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const showStaff = viewer.role !== "manager";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 flex-col border-r border-border bg-section-alt/60 p-6 sm:flex">
        <Link
          href="/business/dashboard"
          aria-label="Tazama Business, overview"
          className="inline-flex w-fit"
        >
          <Logo />
        </Link>

        <div className="mt-8">
          <p className="truncate text-base font-semibold tracking-tight text-foreground">
            {viewer.businessName}
          </p>
          <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            {ROLE_LABEL[viewer.role] ?? viewer.role}
          </span>
        </div>

        <div className="mt-8 flex-1">
          <BusinessSidebarNav showStaff={showStaff} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Tazama
          </Link>
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
        </div>
      </aside>

      {/* Mobile top bar + horizontal nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/business/dashboard" aria-label="Tazama Business, overview">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="max-w-32 truncate text-sm font-medium text-foreground">
              {viewer.businessName}
            </span>
            <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          </div>
        </div>
        <div className="mask-fade-x px-4 pb-3">
          <BusinessSidebarNav showStaff={showStaff} orientation="horizontal" />
        </div>
      </header>

      <main className="sm:pl-64">
        <div className="mx-auto max-w-6xl p-6 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
