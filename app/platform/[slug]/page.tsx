import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhysicalWorld } from "@/components/home/physical-world";
import { Reliability } from "@/components/home/reliability";
import { Workflow } from "@/components/home/workflow";
import { InfoPage } from "@/components/pages/info-page";
import { getSitePage, pagesInGroup } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesInGroup("platform").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSitePage("platform", (await params).slug);
  return page ? { title: page.label, description: page.metaDescription } : {};
}

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSitePage("platform", slug);
  if (!page) notFound();

  const demo =
    slug === "how-it-works" ? (
      <Workflow standalone />
    ) : slug === "dashboard-to-room" ? (
      <PhysicalWorld standalone />
    ) : (
      <Reliability standalone showHardware={false} />
    );
  return <InfoPage page={page} demo={demo} demoIsSection />;
}
