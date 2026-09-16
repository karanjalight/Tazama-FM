"use client";

import { Menu } from "@base-ui/react/menu";
import { BarChart3, Building2, CirclePlay, HelpCircle, ListMusic, QrCode, TrendingUp, type LucideIcon } from "lucide-react";

import { CHAPTER_LABEL, type JumpableChapter } from "@/lib/business/onboarding-tour";
import { cn } from "@/lib/utils";
import { useBusinessTour } from "./tour-provider";

const CHAPTER_ICON: Record<JumpableChapter, LucideIcon> = {
  setup: Building2,
  play: ListMusic,
  engage: QrCode,
  measure: BarChart3,
  grow: TrendingUp,
};

const CHAPTER_HINT: Record<JumpableChapter, string> = {
  setup: "Locations, screens and sound",
  play: "Content, playlists, schedules",
  engage: "How guests join in",
  measure: "Analytics and reports",
  grow: "Advertising and settings",
};

const ITEM =
  "flex cursor-default items-center gap-3 rounded-xl px-2 py-2 text-left outline-none select-none data-highlighted:bg-muted";

/** The (?) button: replay the product tour, or jump straight to a chapter. */
export function TourHelpMenu({ className }: { className?: string }) {
  const { start, chapters } = useBusinessTour();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Help and product tour"
        className={cn(
          "grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted data-popup-open:text-foreground",
          className,
        )}
      >
        <HelpCircle className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup
            finalFocus={false}
            className="w-72 origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift outline-none transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
          >
            <Menu.Item onClick={() => start("help")} className={ITEM}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background">
                <CirclePlay className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Take the product tour</span>
                <span className="block text-xs text-muted-foreground">Every feature in about 3 minutes</span>
              </span>
            </Menu.Item>
            <Menu.Separator className="my-1.5 h-px bg-border" />
            <Menu.Group>
              <Menu.GroupLabel className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                Jump to a chapter
              </Menu.GroupLabel>
              {chapters.map((chapter) => {
                const ChapterIcon = CHAPTER_ICON[chapter];
                return (
                  <Menu.Item key={chapter} onClick={() => start("help", chapter)} className={ITEM}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <ChapterIcon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{CHAPTER_LABEL[chapter]}</span>
                      <span className="block truncate text-xs text-muted-foreground">{CHAPTER_HINT[chapter]}</span>
                    </span>
                  </Menu.Item>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
