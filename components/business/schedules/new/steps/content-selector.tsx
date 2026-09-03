"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FileText, GripVertical, Image as ImageIcon, Library, Trash2, Video } from "lucide-react";

import type { SelectedContentItem } from "../schedule-state";
import { DISPLAY_DURATION_PRESETS } from "../wizard-data";
import { ContentLibraryPickerDialog } from "./content-library-picker-dialog";
import type { ContentItem } from "@/lib/business/content-queries";
import { cn } from "@/lib/utils";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Video, document: FileText } as const;

function ContentThumbnail({ item }: { item: ContentItem }) {
  const Icon = TYPE_ICON[item.contentType];
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      {item.previewUrl ? (
        <Image src={item.previewUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
      ) : (
        <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
          <Icon className="size-4 text-foreground/40" />
        </div>
      )}
    </div>
  );
}

/** The two live controls (preset select + custom-seconds input) that set a
 * content item's on-screen duration — shared by the table cell and the
 * mobile card so the two layouts never drift apart. */
function DisplayDurationControl({
  seconds,
  missing,
  onChange,
}: {
  seconds: number | null;
  missing: boolean;
  onChange: (seconds: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <select
          value={
            seconds != null && DISPLAY_DURATION_PRESETS.some((p) => p.seconds === seconds) ? String(seconds) : "custom"
          }
          onChange={(e) => {
            if (e.target.value === "custom") return;
            onChange(Number(e.target.value));
          }}
          className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
        >
          {DISPLAY_DURATION_PRESETS.map((p) => (
            <option key={p.seconds} value={p.seconds}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        <input
          type="number"
          min={1}
          value={seconds ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="sec"
          className={cn(
            "h-8 w-16 rounded-lg border bg-background px-2 text-xs text-foreground",
            missing ? "border-rose-400" : "border-input",
          )}
        />
      </div>
      {missing && <p className="mt-1 text-[10px] text-rose-400">Set a display duration.</p>}
    </div>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={onRemove}
      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

/** Mobile card — no drag-and-drop (native HTML5 DnD doesn't work on touch),
 * so reordering happens via Up/Down buttons that call the exact same
 * `reorder` swap the table's drag-and-drop calls on drop. */
function ContentCard({
  sel,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeSeconds,
}: {
  sel: SelectedContentItem;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeSeconds: (seconds: number | null) => void;
}) {
  const missingDuration = sel.displaySeconds == null;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <ContentThumbnail item={sel.item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-foreground">{sel.item.title}</p>
            <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400 capitalize">
              {sel.item.contentType}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            aria-label="Move up"
            disabled={isFirst}
            onClick={onMoveUp}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={isLast}
            onClick={onMoveDown}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-border pt-3">
        <DisplayDurationControl seconds={sel.displaySeconds} missing={missingDuration} onChange={onChangeSeconds} />
        <RemoveButton onRemove={onRemove} />
      </div>
    </div>
  );
}

export function ContentSelector({
  businessContent,
  selected,
  onChange,
}: {
  businessContent: ContentItem[];
  selected: SelectedContentItem[];
  onChange: (items: SelectedContentItem[]) => void;
}) {
  const libraryDialog = useDialogTrigger("content-library");
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  function addFromLibrary(items: ContentItem[]) {
    const additions: SelectedContentItem[] = items.map((item) => ({
      contentItemId: item.id,
      item,
      // Video/audio default to the file's own real length; an image has no
      // natural duration, so it's left blank until the user sets one.
      displaySeconds: item.durationSeconds,
    }));
    onChange([...selected, ...additions]);
    toast.success(`Added ${items.length} item${items.length === 1 ? "" : "s"} to this schedule`);
  }

  function removeItem(contentItemId: string) {
    onChange(selected.filter((i) => i.contentItemId !== contentItemId));
  }

  function setDisplaySeconds(contentItemId: string, seconds: number | null) {
    onChange(selected.map((i) => (i.contentItemId === contentItemId ? { ...i, displaySeconds: seconds } : i)));
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...selected];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Selected Content</p>
        <span className="text-xs text-muted-foreground">{selected.length} items</span>
      </div>

      {selected.length > 0 && (
        <>
          {/* Table — sm and up */}
          <div className="mt-2 hidden overflow-hidden rounded-xl border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="w-8 px-2 py-2" />
                  <th className="px-2 py-2 font-medium">Preview</th>
                  <th className="px-2 py-2 font-medium">Title</th>
                  <th className="px-2 py-2 font-medium">Display duration</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((sel, i) => {
                  const missingDuration = sel.displaySeconds == null;
                  return (
                    <tr
                      key={sel.contentItemId}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null) reorder(dragIndex, i);
                        setDragIndex(null);
                      }}
                      className={cn("border-t border-border transition-colors", dragIndex === i && "opacity-50")}
                    >
                      <td className="px-2 py-2 text-center text-muted-foreground">
                        <GripVertical className="mx-auto size-4 cursor-grab" />
                      </td>
                      <td className="px-2 py-2">
                        <ContentThumbnail item={sel.item} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground">{sel.item.title}</p>
                          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400 capitalize">
                            {sel.item.contentType}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <DisplayDurationControl
                          seconds={sel.displaySeconds}
                          missing={missingDuration}
                          onChange={(seconds) => setDisplaySeconds(sel.contentItemId, seconds)}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <RemoveButton onRemove={() => removeItem(sel.contentItemId)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stacked cards — below sm; reordering via Up/Down buttons since
              native HTML5 drag-and-drop doesn't work on touch. */}
          <div className="mt-2 space-y-3 sm:hidden">
            {selected.map((sel, i) => (
              <ContentCard
                key={sel.contentItemId}
                sel={sel}
                isFirst={i === 0}
                isLast={i === selected.length - 1}
                onMoveUp={() => reorder(i, i - 1)}
                onMoveDown={() => reorder(i, i + 1)}
                onRemove={() => removeItem(sel.contentItemId)}
                onChangeSeconds={(seconds) => setDisplaySeconds(sel.contentItemId, seconds)}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={libraryDialog.show}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Library className="size-4" />
        Browse Content Library
      </button>
      {businessContent.length === 0 && (
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Nothing in your Content Library yet — upload content there first.
        </p>
      )}

      <ContentLibraryPickerDialog
        key={libraryDialog.dialogKey}
        open={libraryDialog.open}
        onOpenChange={libraryDialog.onOpenChange}
        items={businessContent}
        alreadySelectedIds={selected.map((s) => s.contentItemId)}
        onAdd={addFromLibrary}
      />
    </div>
  );
}
