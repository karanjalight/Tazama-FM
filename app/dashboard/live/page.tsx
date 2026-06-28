import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Radio } from "lucide-react";

import { CreateRoomButton } from "@/components/dashboard/create-room-button";
import { RoomSummaryCard } from "@/components/rooms/room-summary-card";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getLivePublicRooms, getMyRooms } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";

export const metadata: Metadata = {
  title: "Live",
};

// Live rooms come and go — always show the current state.
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const viewer = await getRoomViewer();
  if (!viewer) redirect("/login");

  const [origin, live, mine] = await Promise.all([
    getOrigin(),
    getLivePublicRooms(viewer.id),
    getMyRooms(viewer.id),
  ]);
  const myLive = mine.filter((r) => r.isLive);

  return (
    <div className="mx-auto space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wider text-brand uppercase">
            <Radio className="size-3.5" />
            Live now
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Live
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Public hangouts playing across Tazama right now.
          </p>
        </div>
        <CreateRoomButton
          accountType={viewer.accountType}
          currentPlan={viewer.plan}
          origin={origin}
          className="w-auto px-5"
        />
      </header>

      {myLive.length > 0 && (
        <section className="space-y-3.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Your live rooms
          </h2>
          <div className="flex flex-wrap gap-4">
            {myLive.map((room) => (
              <RoomSummaryCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3.5">
        {myLive.length > 0 && (
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Across Tazama
          </h2>
        )}
        {live.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {live.map((room) => (
              <RoomSummaryCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-background text-muted-foreground shadow-soft">
              <Radio className="size-5" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              No one’s live right now
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Be the first to start a hangout and others can drop in to listen
              with you.
            </p>
            <div className="mt-5 flex justify-center">
              <CreateRoomButton
                accountType={viewer.accountType}
                currentPlan={viewer.plan}
                origin={origin}
                className="w-auto px-5"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
