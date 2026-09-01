"use client";

import type { ContentStyle } from "./mock-data";

/**
 * Simulates a customer-facing Tazama screen using the business's own chosen
 * branding colors. Unlike the rest of this page, literal colors/inline
 * styles here are intentional — this mockup should NOT follow the app's own
 * light/dark theme tokens, it's previewing the business's brand instead.
 */
export function BusinessPreview({
  businessName,
  primaryColor,
  secondaryColor,
  contentStyle,
}: {
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  contentStyle: ContentStyle;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Business Preview</h2>
      <p className="text-sm text-muted-foreground">
        How your branding appears on Tazama screens right now.
      </p>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl">
        {contentStyle === "Brand-focused" && (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
            style={{ background: primaryColor }}
          >
            <p className="text-lg font-semibold text-white">{businessName}</p>
            <p className="text-sm text-white/85">Happy Hour 4–7 PM</p>
          </div>
        )}

        {contentStyle === "Modern" && (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
            style={{
              backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            <p className="text-lg font-semibold text-white">{businessName}</p>
            <p className="text-sm text-white/85">Happy Hour 4–7 PM</p>
          </div>
        )}

        {contentStyle === "Minimal" && (
          <div className="relative flex h-full flex-col items-center justify-center gap-2 bg-[#111318] p-6 text-center">
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: primaryColor }} />
            <p className="text-lg font-semibold text-white">{businessName}</p>
            <p className="text-sm" style={{ color: secondaryColor === "#0a0a0a" ? "#a1a1aa" : secondaryColor }}>
              Happy Hour 4–7 PM
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
