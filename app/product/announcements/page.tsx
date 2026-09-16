import type { Metadata } from "next";

import {
  AnnouncementList,
  Composer,
  DuckingGraph,
  Recorder,
  Takeover,
  TargetPicker,
} from "@/components/product/announcements/visuals";
import { Chapter, HowItWorks, ProductCta, ProductHero, ProductShell, WorksWith } from "@/components/product/template";
import { getProduct } from "@/lib/product-content";

const product = getProduct("announcements");

export const metadata: Metadata = {
  title: product.metaTitle,
  description: product.metaDescription,
};

export default function AnnouncementsPage() {
  return (
    <ProductShell>
      <ProductHero
        product={product}
        title={
          <>
            Speak to every room. <span className="text-white/40">In your own voice.</span>
          </>
        }
        body="Record or upload a voice message, choose where it plays, and pause or lower the music while it does — right now or on a schedule."
        visual={<Composer />}
        facts={[
          { title: "Record or upload", body: "Record straight from your browser, or upload an audio file." },
          { title: "The music steps aside", body: "Choose whether it pauses or lowers while you speak." },
          { title: "On time, every time", body: "Schedule messages daily, on weekdays, on weekends or weekly." },
        ]}
      />

      <Chapter
        index="01"
        kicker="Record"
        title="Record it in seconds."
        body="Record from your browser with a live waveform, or upload a file you already have. Play it back before anyone else hears it."
        facts={[
          "MP3, WAV, M4A, OGG or WebM, up to 15 MB",
          "Tag it: promotion, operational, event, customer service, emergency or general",
          "A quick path for when you need to speak right now",
        ]}
        visual={<Recorder />}
      />

      <Chapter
        index="02"
        kicker="Targets"
        title="Choose exactly where it plays."
        body="Pick any mix of locations, zones, rooms and audio zones. A room is covered whether you pick it directly or pick the zone around it."
        facts={[
          "Speak to one bar, or to every branch at once",
          "Mix locations and audio zones in one announcement",
          "Screens that have been offline for a while skip it, so old messages don’t play late",
        ]}
        visual={<TargetPicker />}
        surface="raised"
        reverse
      />

      <Chapter
        index="03"
        kicker="Music"
        title="The music steps aside."
        body="Choose whether the music pauses or lowers to a level you set while the announcement plays. When it ends, the music comes back up."
        facts={[
          "Lower the music to exactly the level you choose",
          "Or pause it completely for the messages that matter most",
          "Announcements take priority over ads, signage and song requests",
        ]}
        visual={<DuckingGraph />}
      />

      <Chapter
        index="04"
        kicker="Scheduling"
        title="Say it once. Play it on time."
        body="Send an announcement now, or schedule it — once, or repeating every day, on weekdays, on weekends or every week."
        facts={[
          "“Happy hour starts in ten minutes” — every day at 16:50",
          "Replay, edit or duplicate any announcement",
          "See what went out today and what’s coming up",
        ]}
        visual={<AnnouncementList />}
        surface="raised"
        reverse
      />

      <Chapter
        index="05"
        kicker="On the screen"
        title="Impossible to miss."
        body="While an announcement plays, it takes over the screen — covering ads and signage. Emergency announcements fill the screen in red."
        facts={[
          "Screens receive new announcements instantly",
          "A regular backup check catches anything that was missed",
          "When it ends, screens return to their normal playback",
        ]}
        visual={<Takeover />}
        layout="stacked"
      />

      <HowItWorks
        title="Three steps to the whole venue."
        steps={[
          { title: "Record or upload", body: "Capture the message in your browser or add an audio file." },
          { title: "Choose where and how", body: "Pick the rooms and zones, then pause or lower the music." },
          { title: "Send or schedule", body: "Play it now, or set it to repeat on the days you choose." },
        ]}
      />

      <WorksWith current="announcements" />

      <ProductCta
        title="Let the whole venue hear you."
        body="Record your first announcement in under a minute."
      />
    </ProductShell>
  );
}
