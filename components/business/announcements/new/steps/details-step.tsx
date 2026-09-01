import { CATEGORIES } from "../../mock-data";
import type { AnnouncementDraft } from "../announcement-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DetailsStep({
  draft,
  onChange,
}: {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Announcement Details</h2>
      <p className="text-sm text-muted-foreground">Give this announcement a title and category.</p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ann-title">
            Title <span className="text-rose-400">*</span>
          </Label>
          <Input
            id="ann-title"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Happy Hour Starting Soon"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={draft.category} onValueChange={(v) => onChange({ category: v as AnnouncementDraft["category"] })} items={CATEGORIES} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-description">Description</Label>
          <Textarea
            id="ann-description"
            rows={2}
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional internal note"
          />
        </div>
      </div>
    </div>
  );
}
