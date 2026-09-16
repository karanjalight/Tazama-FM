import type { Metadata } from "next";

import {
  LibraryWindow,
  LiveControl,
  OnScreen,
  PeriodicPattern,
  ScheduleTimeline,
  UploadFlow,
} from "@/components/product/signage/visuals";
import { Chapter, HowItWorks, ProductCta, ProductHero, ProductShell, WorksWith } from "@/components/product/template";
import { getProduct } from "@/lib/product-content";

const product = getProduct("signage");

export const metadata: Metadata = {
  title: product.metaTitle,
  description: product.metaDescription,
};

export default function SignagePage() {
  return (
    <ProductShell>
      <ProductHero
        product={product}
        title={
          <>
            Menus, promotions and video. <span className="text-white/40">On every screen.</span>
          </>
        }
        body="Upload what you want to show, plan the day in sessions and send it to any location, zone or screen — on the TVs you already have."
        visual={<LibraryWindow />}
        facts={[
          { title: "Video and images", body: "Upload MP4, MOV and WebM video, and all the common image formats." },
          { title: "Plan the day once", body: "Sessions switch content and music by the clock." },
          { title: "Any TV", body: "Smart TVs and Android TV boxes, running in full screen." },
        ]}
      />

      <Chapter
        index="01"
        kicker="Content library"
        title="Everything you show, in one place."
        body="Upload videos up to 200 MB and images in every common format. Tazama reads each video’s length for you, and everything can be tagged, searched and filtered."
        facts={[
          "Owners and admins can approve or reject uploads",
          "Edit titles, tags and descriptions any time",
          "See how much storage your library uses",
        ]}
        visual={<UploadFlow />}
      />

      <Chapter
        index="02"
        kicker="Schedules"
        title="Plan the whole day once."
        body="A schedule splits the day into sessions, each with its own content and playlist — and Tazama switches between them on time. Your ad campaigns run alongside."
        facts={[
          "Target locations, zones, rooms or specific screens",
          "Run one schedule across several locations",
          "Between sessions, screens go back to their usual music",
        ]}
        visual={<ScheduleTimeline />}
        layout="stacked"
        surface="raised"
      />

      <Chapter
        index="03"
        kicker="Content & music"
        title="Content and music, taking turns."
        body="Play your content list, then a stretch of music — 1, 5, 10, 15, 30 or 60 minutes — and repeat. Or loop content back to back all session."
        facts={[
          "Set how long each item stays on screen",
          "Loop the list, or play it once",
          "Guest song requests keep working during a session",
        ]}
        visual={<PeriodicPattern />}
        layout="stacked"
      />

      <Chapter
        index="04"
        kicker="Live control"
        title="Change what’s on, while it’s on."
        body="Open a running schedule to see what every screen is showing. Skip to the next piece of content, play a specific song, pause or preview — the screens follow."
        facts={[
          "Now playing and up next, updated live",
          "Skip content or jump to any song",
          "Activating a schedule can override one that conflicts",
        ]}
        visual={<LiveControl />}
        surface="raised"
        layout="stacked"
      />

      <Chapter
        index="05"
        kicker="On the screen"
        title="Made for the big screen."
        body="Screens run Tazama in full screen with no login. Content crossfades, images drift slowly, and videos play muted so the music carries on underneath."
        facts={[
          "Runs on smart TVs and Android TV boxes",
          "Android TV boxes can start Tazama on boot",
          "Screens check in regularly and pick up changes on their own",
        ]}
        visual={<OnScreen />}
        reverse
      />

      <HowItWorks
        title="From upload to screen in three steps."
        steps={[
          { title: "Upload your content", body: "Add videos and images to your library and tag them." },
          { title: "Build a schedule", body: "Split the day into sessions and choose where each one plays." },
          { title: "Activate it", body: "Screens pick it up and switch sessions on time, every day." },
        ]}
      />

      <WorksWith current="signage" />

      <ProductCta
        title="Put your best content on every screen."
        body="Start with one menu on one TV. Plan the rest of the day when you’re ready."
      />
    </ProductShell>
  );
}
