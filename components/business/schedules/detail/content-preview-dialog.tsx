"use client";

import type { ContentItem } from "@/lib/business/content-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ContentPreviewDialog({
  item,
  onOpenChange,
}: {
  item: ContentItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.title}</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="overflow-hidden rounded-xl bg-black">
            {item.contentType === "image" && item.url && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary business-uploaded aspect ratio, not worth Next/Image's fixed-box ceremony here
              <img src={item.url} alt={item.title} className="mx-auto max-h-[70vh] w-auto" />
            )}
            {item.contentType === "video" && item.url && (
              <video src={item.url} controls autoPlay className="mx-auto max-h-[70vh] w-full" />
            )}
            {item.contentType === "audio" && item.url && (
              <audio src={item.url} controls className="w-full p-6" />
            )}
            {item.contentType === "document" && (
              <p className="p-8 text-center text-sm text-white/70">
                Documents can&apos;t be previewed here — download it from the Content Library.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
