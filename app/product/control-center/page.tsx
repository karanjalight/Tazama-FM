import type { Metadata } from "next";

import { OverviewWindow } from "@/components/home/control-center";
import {
  DevicesPanel,
  LocationWizard,
  RemotePlayer,
  TeamPanel,
  ZonesTree,
} from "@/components/product/control-center/visuals";
import { Chapter, HowItWorks, ProductCta, ProductHero, ProductShell, WorksWith } from "@/components/product/template";
import { getProduct } from "@/lib/product-content";

const product = getProduct("control-center");

export const metadata: Metadata = {
  title: product.metaTitle,
  description: product.metaDescription,
};

export default function ControlCenterPage() {
  return (
    <ProductShell>
      <ProductHero
        product={product}
        title={
          <>
            Every location, screen and speaker. <span className="text-white/40">One view.</span>
          </>
        }
        body="See what’s live across your business right now — and change it from anywhere, without walking to a remote."
        visual={<OverviewWindow />}
        facts={[
          { title: "Pair a TV in a minute", body: "A 4-digit code connects any smart TV or Android TV box." },
          { title: "Status you can trust", body: "Every screen and speaker shows online, pending or offline, live." },
          { title: "Access by location", body: "Managers see only the locations they run." },
        ]}
      />

      <Chapter
        index="01"
        kicker="Locations"
        title="Add a location in five short steps."
        body="Name it, pin it on the map, then set up its zones, rooms, screens and sound — all in one guided flow."
        facts={[
          "Pin the address on a map and set the local timezone",
          "Add a photo so your team knows which branch is which",
          "Your progress saves as a draft while you go",
        ]}
        visual={<LocationWizard />}
      />

      <Chapter
        index="02"
        kicker="Zones & rooms"
        title="Map out the space the way your team talks about it."
        body="Split each location into zones like Ground Floor or Terrace, and rooms inside them like the Bar. Each space can have its own screens, speakers and music."
        facts={[
          "Give every room a type and a capacity",
          "Room capacity feeds your advertising reach estimates",
          "See screens, speakers and status for each room",
        ]}
        visual={<ZonesTree />}
        surface="raised"
        reverse
      />

      <Chapter
        index="03"
        kicker="Screens & devices"
        title="Turn any TV into a Tazama screen."
        body="Open Tazama on the TV and enter the 4-digit code — or register the screen first and type its code on the TV. No special hardware, no cables to run."
        facts={[
          "Screens remember their pairing and reconnect on their own",
          "Online, pending and offline status updates live",
          "Every screen gets its own QR code for guest song requests",
        ]}
        visual={<DevicesPanel />}
        layout="stacked"
      />

      <Chapter
        index="04"
        kicker="Team"
        title="The right access for everyone."
        body="Owners and admins run the whole business. Managers get exactly the locations they’re responsible for — nothing more."
        facts={[
          "Add admins and managers by email",
          "Create a manager login for a branch in seconds",
          "Assign locations and change access at any time",
        ]}
        visual={<TeamPanel />}
        surface="raised"
      />

      <Chapter
        index="05"
        kicker="Remote control"
        title="Run the room from anywhere."
        body="Play, pause, skip and set the volume for any location from your dashboard — or push a song to one branch or all of them at once."
        facts={[
          "Remove songs from the queue before they play",
          "Set each location’s genres, or describe the vibe and let AI choose",
          "Share a QR card that opens the location’s public listening room",
        ]}
        visual={<RemotePlayer />}
        layout="stacked"
      />

      <HowItWorks
        title="From sign-up to a live screen in three steps."
        steps={[
          { title: "Add your first location", body: "The guided setup walks you through zones, rooms, screens and sound." },
          { title: "Connect a screen", body: "Open Tazama on the TV, enter the 4-digit code and it’s live." },
          { title: "Press play", body: "A getting-started checklist and a short guided tour show you the rest." },
        ]}
      />

      <WorksWith current="control-center" />

      <ProductCta
        title="See your whole business in one view."
        body="Start with one location and one screen. Add the rest when you’re ready."
      />
    </ProductShell>
  );
}
