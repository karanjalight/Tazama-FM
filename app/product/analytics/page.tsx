import type { Metadata } from "next";

import {
  AdPlaysPanel,
  EstimateExplainer,
  InsightCards,
  ReportingWindow,
  StatusBoard,
} from "@/components/product/analytics/visuals";
import { Chapter, HowItWorks, ProductCta, ProductHero, ProductShell, WorksWith } from "@/components/product/template";
import { getProduct } from "@/lib/product-content";

const product = getProduct("analytics");

export const metadata: Metadata = {
  title: product.metaTitle,
  description: product.metaDescription,
};

export default function AnalyticsPage() {
  return (
    <ProductShell>
      <ProductHero
        product={product}
        title={
          <>
            Know what’s live. <span className="text-white/40">And what’s working.</span>
          </>
        }
        body="See every screen’s status as it changes, what’s playing in each location, and how every ad campaign performs — with the estimates explained."
        visual={<ReportingWindow />}
        facts={[
          { title: "Live screen status", body: "Online, pending and offline — per location, as screens check in." },
          { title: "Every ad play counted", body: "Plays are recorded when a screen actually plays the ad." },
          { title: "Estimates, explained", body: "Views, reach and revenue show exactly how they were worked out." },
        ]}
      />

      <Chapter
        index="01"
        kicker="Screen status"
        title="Every screen, right now."
        body="Screens check in as they run, so you can see which are online, pending or offline in each location — and which have been offline the longest."
        facts={[
          "Status refreshes on its own, about every 10 seconds",
          "Pending screens show pairings that aren’t finished",
          "See what’s playing and how many guests are listening in",
        ]}
        visual={<StatusBoard />}
      />

      <Chapter
        index="02"
        kicker="Ad performance"
        title="Every ad play, counted."
        body="Each time a screen plays an ad, Tazama records it. Break plays down by location, room and screen, see when ads run across the week, and how often they play to the end."
        facts={[
          "Pick any date range, then break plays down by location, room or screen",
          "Completion rate for every campaign",
          "A day-by-hour map of when your ads play",
        ]}
        visual={<AdPlaysPanel />}
        surface="raised"
        layout="stacked"
      />

      <Chapter
        index="03"
        kicker="Estimates"
        title="Reach you can explain."
        body="Views, reach and revenue are estimates, and Tazama is clear about it. Each one is worked out from the room’s capacity, how busy it usually is at that hour, and an attention rate — and the assumptions are shown."
        facts={[
          "Estimated views and reach for every campaign",
          "Estimated revenue in KES",
          "Room capacity comes straight from your Rooms & Zones",
        ]}
        visual={<EstimateExplainer />}
        layout="stacked"
      />

      <Chapter
        index="04"
        kicker="Insights"
        title="The highlights, spelled out."
        body="The ad performance page picks out what stands out in your numbers — your peak hour, strongest room, best-completing campaign and how plays are trending."
        facts={[
          "Worked out directly from your ad play data",
          "Updates as your campaigns run",
          "Each one says exactly which numbers it’s based on",
        ]}
        visual={<InsightCards />}
        surface="raised"
        reverse
      />

      <HowItWorks
        title="Reporting that starts with your first screen."
        steps={[
          { title: "Connect your screens", body: "Status reporting starts the moment a screen is paired." },
          { title: "Run a campaign", body: "Every play is counted from the screens that show it." },
          { title: "Read the results", body: "Check live status any time, and ad performance for any date range." },
        ]}
      />

      <WorksWith current="analytics" />

      <ProductCta
        title="See what’s happening across every location."
        body="Pair your first screen and its status shows up straight away."
      />
    </ProductShell>
  );
}
