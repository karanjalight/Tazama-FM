"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { SettingsNavList } from "./settings-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Settings nav collapsed into a drawer below `lg`. */
export function SettingsMobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 lg:hidden")}
      >
        <Menu className="size-4" />
        Settings menu
      </SheetTrigger>
      <SheetContent side="left" className="w-4/5 max-w-xs">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4" onClick={() => setOpen(false)}>
          <SettingsNavList />
        </div>
      </SheetContent>
    </Sheet>
  );
}
