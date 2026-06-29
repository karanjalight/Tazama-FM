import Link from "next/link";

import { Cover } from "@/components/cover";

/** A browse category tile — real cover art when the catalog has it, else generated. */
export function GenreTile({
  value,
  label,
  cover,
}: {
  value: string;
  label: string;
  cover?: string | null;
}) {
  return (
    <Link
      href={`/dashboard/browse/${value}`}
      aria-label={`Browse ${label}`}
      className="group block"
    >
      <Cover
        title={label}
        src={cover ?? undefined}
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
        className="shadow-soft transition duration-300 group-hover:shadow-lift"
      />
      <p className="mt-2.5 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
        {label}
      </p>
    </Link>
  );
}
