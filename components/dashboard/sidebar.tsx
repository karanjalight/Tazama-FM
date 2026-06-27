import Link from "next/link";
import { Plus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ProfileMenu } from "./profile-menu";
import { dashboardNav } from "./nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/components/auth/account-type-toggle";

export function Sidebar({
  name,
  secondary,
  email,
  accountType,
  avatarKey,
}: {
  name: string;
  secondary: string;
  email?: string;
  accountType: AccountType | null;
  avatarKey: string | null;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background md:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard" aria-label="Tazama, dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="#"
          className={cn(
            buttonVariants({ variant: "brand" }),
            "h-10 w-full justify-start gap-2 rounded-xl px-3 text-[14px]",
          )}
        >
          <Plus className="size-4" />
          Create a room
        </Link>
      </div>

      <nav aria-label="Dashboard" className="mt-4 flex-1 space-y-1 px-3">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4.5", item.active && "text-brand")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <ProfileMenu
            name={name}
            secondary={secondary}
            email={email}
            accountType={accountType}
            avatarKey={avatarKey}
            variant="chip"
          />
        </div>
        <ThemeToggle className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground" />
      </div>
    </aside>
  );
}
