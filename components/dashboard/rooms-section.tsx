import { getRoomViewer } from "@/lib/rooms/viewer";
import { getMyRooms, getLivePublicRooms } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";
import { CreateRoomCard } from "@/components/rooms/create-room-card";
import { RoomSummaryCard } from "@/components/rooms/room-summary-card";

/**
 * The dashboard rooms area, rendered directly under the greeting: a "Your Rooms"
 * strip led by the create-room card, plus a "Live now" discovery strip.
 */
export async function RoomsSection() {
  const viewer = await getRoomViewer();
  if (!viewer) return null;

  const [origin, mine, live] = await Promise.all([
    getOrigin(),
    getMyRooms(viewer.id),
    getLivePublicRooms(viewer.id),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3.5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Your Rooms
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Start a hangout and listen together in real time
            </p>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex items-stretch gap-4 overflow-x-auto px-1 pt-1 pb-2">
          <CreateRoomCard
            accountType={viewer.accountType}
            currentPlan={viewer.plan}
            origin={origin}
          />
          {mine.map((room) => (
            <RoomSummaryCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {live.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Live now
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Public hangouts playing across Tazama
              </p>
            </div>
          </div>
          <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-2">
            {live.map((room) => (
              <RoomSummaryCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
