"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Music,
  Pencil,
  Trash2,
  Video,
  X,
  XCircle,
} from "lucide-react";

import type { ContentItem, ContentStatus } from "@/lib/business/content-queries";
import { formatDuration, formatFileSize } from "@/lib/business/content-format";
import { formatRelativeTime, cn } from "@/lib/utils";
import { updateContentItem, deleteContentItem } from "@/app/business/content/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TABS = ["Overview", "Details", "Activity"] as const;
type Tab = (typeof TABS)[number];

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Music, document: FileText } as const;

function StatusBadge({ status }: { status: ContentStatus }) {
  const cls =
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "pending"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-rose-500/15 text-rose-400";
  const label = status === "approved" ? "Approved" : status === "pending" ? "Pending" : "Rejected";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>{label}</span>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

/**
 * The caller MUST render this keyed by `item.id` (`key={item.id}`) — local
 * edit-draft state is only initialized once per mount, and switching to a
 * different item is meant to remount (reset drafts, jump back to the
 * Overview tab) rather than sync via an effect.
 */
export function ContentDetailPanel({
  item,
  businessId,
  canModerate,
  onClose,
}: {
  item: ContentItem;
  businessId: string;
  canModerate: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(item.title);
  const [tagValue, setTagValue] = React.useState(item.tag ?? "");
  const [description, setDescription] = React.useState(item.description ?? "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [moderating, setModerating] = React.useState(false);

  const Icon = TYPE_ICON[item.contentType];

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    const res = await updateContentItem({
      businessId,
      id: item.id,
      title: trimmedTitle,
      tag: tagValue.trim(),
      description: description.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Content updated.");
    setEditing(false);
    router.refresh();
  }

  async function handleStatus(status: ContentStatus) {
    setModerating(true);
    const res = await updateContentItem({ businessId, id: item.id, status });
    setModerating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(status === "approved" ? "Content approved." : "Content rejected.");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await deleteContentItem({ businessId, id: item.id });
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Content deleted.");
    onClose();
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video bg-muted">
        {item.contentType === "image" && item.previewUrl ? (
          <Image src={item.previewUrl} alt="" fill sizes="400px" className="object-cover" unoptimized />
        ) : item.contentType === "video" && item.url ? (
          <video
            src={item.url}
            controls
            preload="metadata"
            className="absolute inset-0 size-full bg-black object-contain"
          />
        ) : item.contentType === "document" && item.format === "PDF" && item.url ? (
          <iframe src={item.url} title={item.title} className="absolute inset-0 size-full border-0 bg-white" />
        ) : item.contentType === "audio" && item.url ? (
          <div className="grid h-full place-items-center gap-3 bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 p-4">
            <Icon className="size-10 text-foreground/40" />
            <audio src={item.url} controls className="w-full max-w-64" />
          </div>
        ) : (
          <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
            <Icon className="size-10 text-foreground/40" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 min-w-0 flex-1 text-base font-semibold"
              maxLength={120}
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
          )}
          {item.format && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.format}
            </span>
          )}
          <StatusBadge status={item.status} />
        </div>

        {canModerate && item.status === "pending" && !editing && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={moderating}
              onClick={() => handleStatus("approved")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Check className="size-3.5" /> Approve
            </button>
            <button
              type="button"
              disabled={moderating}
              onClick={() => handleStatus("rejected")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              <XCircle className="size-3.5" /> Reject
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-2.5 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Description</h3>
              {editing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1"
                  maxLength={2000}
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{item.description || "No description yet."}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {item.durationSeconds != null && (
                <DetailField label="Duration" value={formatDuration(item.durationSeconds)} />
              )}
              {item.resolution && <DetailField label="Resolution" value={item.resolution} />}
              <DetailField label="File Size" value={formatFileSize(item.sizeBytes)} />
              <DetailField label="Format" value={item.format ?? "—"} />
              <DetailField label="Uploaded By" value={item.uploadedByName ?? "Unknown"} />
              <DetailField label="Uploaded" value={formatRelativeTime(item.createdAt)} />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Tag</p>
              {editing ? (
                <Input
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  placeholder="e.g. Promotions"
                  maxLength={40}
                  className="h-9"
                />
              ) : item.tag ? (
                <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-400">
                  {item.tag}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">No tag</span>
              )}
            </div>
          </div>
        )}

        {tab === "Details" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Type" value={item.contentType} />
            <DetailField label="Purpose" value={item.purpose === "content" ? "Content" : "Ad Creative"} />
            <DetailField label="Uploaded" value={formatRelativeTime(item.createdAt)} />
            <DetailField label="Status" value={item.status} />
          </div>
        )}

        {tab === "Activity" && (
          <div className="mt-4 space-y-2.5 text-sm">
            <p className="text-muted-foreground">
              Uploaded by <span className="text-foreground">{item.uploadedByName ?? "Unknown"}</span> ·{" "}
              {formatRelativeTime(item.createdAt)}
            </p>
            {item.reviewedAt && (
              <p className="text-muted-foreground">
                Status set to <span className="text-foreground">{item.status}</span> by{" "}
                <span className="text-foreground">{item.reviewedByName ?? "a reviewer"}</span> ·{" "}
                {formatRelativeTime(item.reviewedAt)}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setTitle(item.title);
                  setTagValue(item.tag ?? "");
                  setDescription(item.description ?? "");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              <a
                href={item.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ImageIcon className="size-3.5" />
                Preview
              </a>
              <a
                href={item.url ?? "#"}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download className="size-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-strong py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a82420] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
