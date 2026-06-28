import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ProfileMenu } from "./profile-menu";
import { SidebarNav } from "./sidebar-nav";
import { CreateRoomButton } from "./create-room-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AccountType } from "@/components/auth/account-type-toggle";
import type { SubscriptionPlan } from "@/lib/billing/plans";

export function Sidebar({
  name,
  secondary,
  email,
  accountType,
  avatarKey,
  currentPlan,
  origin,
}: {
  name: string;
  secondary: string;
  email?: string;
  accountType: AccountType | null;
  avatarKey: string | null;
  currentPlan: SubscriptionPlan;
  origin: string;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background md:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard" aria-label="Tazama, dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        <CreateRoomButton
          accountType={accountType}
          currentPlan={currentPlan}
          origin={origin}
        />
      </div>

      <SidebarNav />

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
