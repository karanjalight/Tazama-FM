import Link from "next/link";
import { MonitorOff } from "lucide-react";

/** Friendly dead end for a pairing link that doesn't resolve to a usable screen. */
export function PairUnavailable({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <MonitorOff className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          Go to Tazama
        </Link>
      </div>
    </main>
  );
}
