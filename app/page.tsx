import type { Metadata } from "next";

import { SiteHeader } from "@/components/nav/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Hero } from "@/components/home/hero";
import { Problem } from "@/components/home/problem";
import { OnePlatform } from "@/components/home/one-platform";
import { ControlCenter } from "@/components/home/control-center";
import { Workflow } from "@/components/home/workflow";
import { PhysicalWorld } from "@/components/home/physical-world";
import { Industries } from "@/components/home/industries";
import { Locations } from "@/components/home/locations";
import { Engagement } from "@/components/home/engagement";
import { Advertising } from "@/components/home/advertising";
import { Reliability } from "@/components/home/reliability";
import { Analytics } from "@/components/home/analytics";
import { FinalCta } from "@/components/home/final-cta";
import { getHeaderAuth } from "@/lib/auth/profile";
import { marketingFontVars } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const title = "Tazama — Everything your customers see and hear. One platform.";
const description =
  "Run the music, digital signage, video, promotions, announcements and advertising in every location — from one platform.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, images: [{ url: "/brand/logo-stacked.png", width: 2000, height: 2000, alt: "Tazama" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/brand/logo-stacked.png"] },
};

// Dynamic only for the per-visitor auth state in the header.
export default async function Home() {
  const auth = await getHeaderAuth();

  return (
    <>
      <SiteHeader auth={auth} />
      <main id="content" className={cn(marketingFontVars, "flex-1 overflow-x-clip bg-ink font-display")}>
        <Hero />
        <Problem />
        <OnePlatform />
        <ControlCenter />
        <Workflow />
        <PhysicalWorld />
        <Industries />
        <Locations />
        <Engagement />
        <Advertising />
        <Reliability />
        <Analytics />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
