import { SiteHeader } from "@/components/nav/site-header";
import { Hero } from "@/components/sections/hero";
import { LiveNow } from "@/components/sections/live-now";
import { HowItWorks } from "@/components/sections/how-it-works";
import { ForBusiness } from "@/components/sections/for-business";
import { SiteFooter } from "@/components/sections/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="flex-1 ">
        <Hero />
        <LiveNow />
        <HowItWorks />
        <ForBusiness />
      </main>
      <SiteFooter />
    </>
  );
}
