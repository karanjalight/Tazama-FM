"use client";

import { Menu } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Mobile navigation in a slide-in sheet (Base UI dialog → focus-trapped). */
export function MobileNav({ scrolled }: { scrolled: boolean }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open menu"
        className={cn(
          "inline-grid size-9 place-items-center rounded-md transition-colors md:hidden",
          scrolled
            ? "text-foreground hover:bg-muted"
            : "text-white hover:bg-white/10",
        )}
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent side="right" className="w-[84%] max-w-xs gap-0 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="sr-only">Tazama menu</SheetTitle>
          <Logo className="text-foreground" />
        </SheetHeader>

        <nav aria-label="Mobile" className="flex flex-col p-2">
          {navLinks.map((l) => (
            <SheetClose
              key={l.href}
              render={
                <a
                  href={l.href}
                  className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                />
              }
            >
              {l.label}
            </SheetClose>
          ))}
          <SheetClose
            render={
              <a
                href="/login"
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              />
            }
          >
            Log in
          </SheetClose>
        </nav>

        <SheetFooter className="p-5">
          <SheetClose
            render={
              <a
                href="/signup"
                className={cn(buttonVariants({ variant: "brand", size: "xl" }), "w-full")}
              />
            }
          >
            Create a room
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
