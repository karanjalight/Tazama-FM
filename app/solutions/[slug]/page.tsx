import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Advertising } from "@/components/home/advertising";
import { Engagement } from "@/components/home/engagement";
import { Locations } from "@/components/home/locations";
import { InfoPage } from "@/components/pages/info-page";
import { PeriodicPattern, ScheduleTimeline } from "@/components/product/signage/visuals";
import { getSitePage, pagesInGroup } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesInGroup("solutions").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSitePage("solutions", (await params).slug);
  return page ? { title: page.label, description: page.metaDescription } : {};
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSitePage("solutions", slug);
  if (!page) notFound();

  switch (slug) {
    case "scheduling":
      return (
        <InfoPage
          page={page}
          demo={
            <div className="space-y-16">
              <ScheduleTimeline />
              <PeriodicPattern />
            </div>
          }
        />
      );
    case "multi-location":
      return <InfoPage page={page} demo={<Locations standalone />} demoIsSection />;
    case "guest-engagement":
      return <InfoPage page={page} demo={<Engagement standalone />} demoIsSection />;
    default:
      return <InfoPage page={page} demo={<Advertising standalone />} demoIsSection />;
  }
}
