import Link from "next/link";

import { Cover } from "@/components/cover";
import type { Genre } from "@/lib/genres";

/** A browse category tile — generated cover art linking into the genre page. */
export function GenreTile({ genre }: { genre: Genre }) {
  return (
    <Link
      href={`/dashboard/browse/${genre.value}`}
      aria-label={`Browse ${genre.label}`}
      className="group block"
    >
      <Cover
        title={genre.label}
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
        className="shadow-soft transition duration-300 group-hover:shadow-lift"
      />
      <p className="mt-2.5 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
        {genre.label}
      </p>
    </Link>
  );
}
