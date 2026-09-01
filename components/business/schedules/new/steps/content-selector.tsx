"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { FileText, GripVertical, Image as ImageIcon, Library, Pencil, Trash2, UploadCloud, Video } from "lucide-react";

import type { SelectedContentItem } from "../schedule-state";
import type { ScheduleContentItem } from "../wizard-data";
import { ContentLibraryPickerDialog } from "./content-library-picker-dialog";
import { cn } from "@/lib/utils";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const TYPE_ICON = { Video, Image: ImageIcon, Document: FileText } as const;

export function ContentSelector({
  selected,
  onChange,
}: {
  selected: SelectedContentItem[];
  onChange: (items: SelectedContentItem[]) => void;
}) {
  const libraryDialog = useDialogTrigger("content-library");
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function addFromLibrary(items: ScheduleContentItem[]) {
    const additions = items.map((item, i) => ({ ...item, order: selected.length + i }));
    onChange([...selected, ...additions]);
    toast.success(`Added ${items.length} item${items.length === 1 ? "" : "s"} to this schedule`);
  }

  function removeItem(id: string) {
    onChange(selected.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx })));
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const additions: SelectedContentItem[] = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      type: file.type.startsWith("video") ? "Video" : file.type.startsWith("image") ? "Image" : "Document",
      format: (file.name.split(".").pop() ?? "FILE").toUpperCase(),
      duration: file.type.startsWith("video") ? "00:10" : null,
      resolution: "1920×1080",
      thumbnail: file.type.startsWith("image") ? URL.createObjectURL(file) : null,
      order: selected.length + i,
    }));
    onChange([...selected, ...additions]);
    toast.success(`Uploaded ${additions.length} file${additions.length === 1 ? "" : "s"}`);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...selected];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((item, idx) => ({ ...item, order: idx })));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Selected Content</p>
        <span className="text-xs text-muted-foreground">{selected.length} items</span>
      </div>

      {selected.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2 font-medium">Preview</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Duration</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="px-2 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((item, i) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <tr
                    key={item.id}
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
                      <div className="relative size-12 overflow-hidden rounded-lg bg-muted">
                        {item.thumbnail ? (
                          <Image src={item.thumbnail} alt="" fill sizes="48px" className="object-cover" unoptimized />
                        ) : (
                          <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                            <Icon className="size-4 text-foreground/40" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.resolution}</p>
                    </td>
                    <td className="px-2 py-2 font-mono text-muted-foreground">{item.duration ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">Uploaded</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit"
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeItem(item.id)}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-input py-6 text-center"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <UploadCloud className="size-6" />
          <span className="text-sm font-medium">Upload files</span>
          <span className="text-xs">or drag and drop</span>
        </button>
        <p className="text-[11px] text-muted-foreground/70">Supported formats: MP4, MOV, JPG, PNG · Max size: 500MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <button
        type="button"
        onClick={libraryDialog.show}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Library className="size-4" />
        Browse Library
      </button>

      <ContentLibraryPickerDialog
        key={libraryDialog.dialogKey}
        open={libraryDialog.open}
        onOpenChange={libraryDialog.onOpenChange}
        alreadySelectedIds={selected.map((s) => s.id)}
        onAdd={addFromLibrary}
      />
    </div>
  );
}
