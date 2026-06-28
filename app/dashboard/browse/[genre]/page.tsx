import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GenreTracks } from "@/components/browse/genre-tracks";
import { getGenre, GENRE_VALUES } from "@/lib/genres";
import { getCachedTracksByGenre } from "@/lib/tracks";

// Reflect the live catalog (it grows as genres are seeded) rather than baking
// tracks at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const g = getGenre(genre);
  return { title: g ? g.label : "Browse" };
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;
  if (!GENRE_VALUES.includes(genre)) notFound();

  const meta = getGenre(genre);
  const initial = await getCachedTracksByGenre(genre, 24);

  return (
    <div className="mx-auto space-y-7">
      <header className="space-y-3">
        <Link
          href="/dashboard/browse"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Browse
        </Link>
        <div>
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Genre
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {meta?.label ?? genre}
          </h1>
        </div>
      </header>

      <GenreTracks genre={genre} initial={initial} />
    </div>
  );
}
