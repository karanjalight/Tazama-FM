import Image from "next/image";
import type { BusinessHeroMotif } from "@/lib/data";
import { EqualizerMotif, RingsMotif, SignageMotif, TvMotif } from "./motifs";

/**
 * A hero slide's background: a real photo when `image` is given, otherwise
 * the matching decorative motif. Shared by both heroes so swapping in real
 * photography for any slide is just setting `image` on it in lib/data.ts
 * (businessHeroSlides) and dropping the file into public/hero/ — no
 * component changes needed.
 */
export function HeroBackdrop({
  motif,
  image,
  priority,
}: {
  motif: BusinessHeroMotif;
  image?: string;
  priority?: boolean;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="scale-[1.15] object-cover "
      />
    );
  }

  switch (motif) {
    case "music":
      return <EqualizerMotif />;
    case "signage":
      return <SignageMotif />;
    case "tv":
      return <TvMotif />;
    default:
      return <RingsMotif />;
  }
}
