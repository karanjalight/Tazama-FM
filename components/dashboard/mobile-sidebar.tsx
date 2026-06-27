"use client";

import { LogOut, Menu, Plus } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { UserBadge } from "./user-badge";
import { dashboardNav } from "./nav-items";
import { useSignOut } from "./use-sign-out";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/components/auth/account-type-toggle";

/** Slide-in dashboard navigation for small screens (hamburger → left drawer). */
export function MobileSidebar({
  name,
  secondary,
  accountType,
  avatarKey,
}: {
  name: string;
  secondary: string;
  accountType: AccountType | null;
  avatarKey: string | null;
}) {
  const { signOut, signingOut } = useSignOut();

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent side="left" className="w-[82%] max-w-xs gap-0 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="sr-only">Tazama menu</SheetTitle>
          <Logo />
        </SheetHeader>

        <div className="p-3">
          <SheetClose
            render={
              <a
                href="#"
                className={cn(
                  buttonVariants({ variant: "brand" }),
                  "h-10 w-full justify-start gap-2 rounded-xl px-3 text-[14px]",
                )}
              />
            }
          >
            <Plus className="size-4" />
            Create a room
          </SheetClose>
        </div>

        <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3">
          {dashboardNav.map((item) => {
            const Icon = item.icon;
            return (
              <SheetClose
                key={item.label}
                render={
                  <a
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      item.active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  />
                }
              >
                <Icon className={cn("size-4.5", item.active && "text-brand")} />
                {item.label}
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <UserBadge
              accountType={accountType}
              avatarKey={avatarKey}
              name={name}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {secondary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
