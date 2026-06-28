import type { Metadata } from "next";

import { GenreTile } from "@/components/browse/genre-tile";
import { GENRES } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Browse",
};

export default function BrowsePage() {
  return (
    <div className="mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Browse
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Explore the sounds moving across Tazama.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GENRES.map((genre) => (
          <GenreTile key={genre.value} genre={genre} />
        ))}
      </div>
    </div>
  );
}
