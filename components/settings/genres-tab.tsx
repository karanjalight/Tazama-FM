"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { GenreSelect } from "@/components/auth/genre-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { genericErrorMessage } from "@/lib/auth/messages";

export function GenresTab({ initialGenres }: { initialGenres: string[] }) {
  const router = useRouter();
  const [genres, setGenres] = React.useState<string[]>(initialGenres);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (genres.length < 1) {
      setError("Pick at least one genre.");
      return;
    }
    setError(undefined);
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error("Your session expired. Please log in again.");
      return;
    }

    const { error: e2 } = await supabase
      .from("profiles")
      .upsert({ id: user.id, genre_preferences: genres });

    setLoading(false);
    if (e2) {
      toast.error(genericErrorMessage());
      return;
    }
    toast.success("Genres updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Genre preferences</CardTitle>
          <CardDescription>
            We tune your dashboard and rooms to these. Search to discover native
            sounds.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <GenreSelect
            value={genres}
            onChange={setGenres}
            error={error}
            disabled={loading}
          />
        </CardContent>

        <CardFooter className="justify-between">
          <span className="text-xs text-muted-foreground">
            {genres.length} selected
          </span>
          <Button type="submit" variant="brand" size="pill" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Saving…" : "Save genres"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
