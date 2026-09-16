import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Hardware } from "@/components/home/reliability";
import { InfoPage } from "@/components/pages/info-page";
import { DevicesPanel } from "@/components/product/control-center/visuals";
import { getSitePage } from "@/lib/site-pages";

/** Resources with their own page under /resources. (Contact sales lives at /contact.) */
const SLUGS = ["hardware"];

export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSitePage("resources", (await params).slug);
  return page ? { title: page.label, description: page.metaDescription } : {};
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SLUGS.includes(slug) ? getSitePage("resources", slug) : undefined;
  if (!page) notFound();

  return (
    <InfoPage
      page={page}
      demo={
        <div className="space-y-16">
          <DevicesPanel />
          <Hardware className="mt-0 sm:mt-0" />
        </div>
      }
    />
  );
}
