import type { Metadata } from "next";

import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Search
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Find a song to play or a room to join.
        </p>
      </header>

      <SearchExperience />
    </div>
  );
}
