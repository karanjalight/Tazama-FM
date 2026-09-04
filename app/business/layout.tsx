import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronDown, HelpCircle } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { BusinessSidebarNav } from "@/components/business/business-sidebar-nav";
import { BusinessBottomNav } from "@/components/business/business-bottom-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { listBranches } from "@/lib/business/queries";

const ROLE_LABEL: Record<string, string> = {
  owner: "Business Owner",
  admin: "Admin",
  manager: "Manager",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "B";
}

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const branches = await listBranches(viewer.businessId);
  const defaultBranch = branches.find((b) => canActOnBranch(viewer, b.id)) ?? null;

  const showStaff = viewer.role !== "manager";
  const roleLabel = ROLE_LABEL[viewer.role] ?? viewer.role;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 shrink-0 flex-col border-r border-border bg-section-alt/60 p-4 sm:flex">
        <Link
          href="/business/dashboard"
          aria-label="Tazama Business, overview"
          className="inline-flex w-fit"
        >
          <Logo />
        </Link>

        {/* <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
            <Store className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {viewer.businessName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </div> */}

        <div className="no-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto">
          <BusinessSidebarNav showStaff={showStaff} defaultBranchSlug={defaultBranch?.slug ?? null} />
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
            <Avatar size="sm">
              <AvatarFallback className="bg-brand/15 text-brand font-medium">
                {initialsOf(viewer.businessName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {viewer.businessName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <Link
            href="/dashboard"
            className="mt-2 block px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Tazama
          </Link>
        </div>
      </aside>

      {/* Mobile top bar — just identity now; BusinessBottomNav (below) owns
          primary navigation on mobile, replacing what used to be a
          horizontally-scrolling row of all ~20 nav items here. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/business/dashboard" aria-label="Tazama Business, overview">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="max-w-32 truncate text-sm font-medium text-foreground">
              {viewer.businessName}
            </span>
            <Avatar size="sm">
              <AvatarFallback className="bg-brand/15 text-brand font-medium">
                {initialsOf(viewer.businessName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <BusinessBottomNav showStaff={showStaff} defaultBranchSlug={defaultBranch?.slug ?? null} />

      <main className="sm:pl-72">
        <div className="sticky top-0 z-10 hidden items-center justify-end gap-3 border-b border-border bg-background/85 px-6 py-3 backdrop-blur-xl sm:flex lg:px-10">
          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle className="rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
            <button
              type="button"
              aria-label="Help"
              className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-brand font-mono text-[10px] font-semibold text-white">
                3
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-muted"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-brand/15 text-brand font-medium">
                  {initialsOf(viewer.businessName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-left">
                <span className="block text-sm font-medium text-foreground">
                  {viewer.businessName}
                </span>
                <span className="block text-xs text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* pb-24 clears the fixed h-16 BusinessBottomNav (plus its own
            safe-area margin) on mobile; sm: and up have no bottom bar. */}
        <div className="p-6 pb-24 sm:p-10">{children}</div>
      </main>
    </div>
  );
}

