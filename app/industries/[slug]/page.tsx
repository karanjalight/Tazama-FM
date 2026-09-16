import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Industries } from "@/components/home/industries";
import { InfoPage } from "@/components/pages/info-page";
import { getSitePage, pagesInGroup } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesInGroup("industries").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSitePage("industries", (await params).slug);
  return page ? { title: `Tazama for ${page.label.toLowerCase()}`, description: page.metaDescription } : {};
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getSitePage("industries", (await params).slug);
  if (!page) notFound();
  return <InfoPage page={page} demo={<Industries standalone only={page.industry} />} demoIsSection />;
}
