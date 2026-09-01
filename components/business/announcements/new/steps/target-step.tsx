import type { AnnouncementDraft } from "../announcement-draft";
import type { AnnouncementTargetOptions } from "../../mock-data";
import { TargetSelector } from "../../target-selector";

export function TargetStep({
  draft,
  options,
  onChange,
}: {
  draft: AnnouncementDraft;
  options: AnnouncementTargetOptions;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <TargetSelector
        target={draft.target}
        options={options}
        onChange={(target) => onChange({ target: { ...draft.target, ...target } })}
      />
    </div>
  );
}
