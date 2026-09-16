import type { Metadata } from "next";

import { PairExperience } from "@/components/pair/pair-experience";
import { PairUnavailable } from "@/components/pair/pair-unavailable";
import { getPairViewer } from "@/lib/pair/identity";
import { getPairDeviceBySlug, getPairState } from "@/lib/pair/queries";

// Live venue state and per-phone cookies — always render fresh.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const device = await getPairDeviceBySlug(slug);
  return {
    title: device ? `Pair with ${device.name}` : "Pair with a screen",
    robots: { index: false, follow: false },
  };
}

/**
 * Pair with a Screen — a guest scans a device's QR code (or opens its link)
 * to pair their phone with that screen or speaker. Public: no sign-in needed;
 * guests get the same signed cookie identity branch rooms already use.
 */
export default async function PairWithDevicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const device = await getPairDeviceBySlug(slug);
  if (!device) {
    return (
      <PairUnavailable
        title="Screen not found"
        body="This link doesn't match a screen. Try scanning the code on the screen again."
      />
    );
  }
  if (!device.roomId) {
    return (
      <PairUnavailable
        title={`${device.name} isn't set up yet`}
        body="Ask a staff member to assign this screen to a room, then scan again."
      />
    );
  }

  const { viewer, needsPair, suggestedName } = await getPairViewer();
  const initialState = await getPairState(device.roomId, needsPair ? null : viewer.id);

  return (
    <PairExperience
      device={device}
      roomId={device.roomId}
      viewer={viewer}
      needsPair={needsPair}
      suggestedName={suggestedName}
      initialState={initialState}
    />
  );
}
