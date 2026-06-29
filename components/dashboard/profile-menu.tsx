"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";

import { UserBadge } from "./user-badge";
import { useSignOut } from "./use-sign-out";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/components/auth/account-type-toggle";

interface ProfileMenuProps {
  name: string;
  secondary: string;
  email?: string;
  accountType: AccountType | null;
  avatarKey: string | null;
  /** Layout of the trigger: a full chip (sidebar) or a compact avatar (topbar). */
  variant?: "chip" | "compact";
}

export function ProfileMenu({
  name,
  secondary,
  email,
  accountType,
  avatarKey,
  variant = "chip",
}: ProfileMenuProps) {
  const { signOut, signingOut } = useSignOut();

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/30",
          variant === "chip"
            ? "w-full border border-border bg-background p-2 hover:bg-muted"
            : "p-0.5 hover:opacity-90",
        )}
      >
        <UserBadge
          accountType={accountType}
          avatarKey={avatarKey}
          name={name}
          size={variant === "chip" ? "md" : "md"}
        />
        {variant === "chip" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {secondary}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          sideOffset={8}
          align="end"
          className="z-50 outline-none"
        >
          <Menu.Popup
            className={cn(
              "min-w-60 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift outline-none",
              "origin-[var(--transform-origin)] transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
            )}
          >
            <div className="flex items-center gap-3 px-2.5 py-2">
              <UserBadge
                accountType={accountType}
                avatarKey={avatarKey}
                name={name}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email ?? secondary}
                </p>
              </div>
            </div>

            <Menu.Separator className="my-1.5 h-px bg-border" />

            <Menu.Item
              render={<Link href="/dashboard/settings?tab=profile" />}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-muted"
            >
              <UserRound className="size-4 text-muted-foreground" />
              Profile
            </Menu.Item>
            <Menu.Item
              render={<Link href="/dashboard/settings" />}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-muted"
            >
              <Settings className="size-4 text-muted-foreground" />
              Settings
            </Menu.Item>

            <Menu.Separator className="my-1.5 h-px bg-border" />

            <Menu.Item
              closeOnClick={false}
              onClick={signOut}
              disabled={signingOut}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-brand outline-none select-none data-disabled:opacity-60 data-highlighted:bg-brand/10"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
