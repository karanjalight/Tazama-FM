import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { Container, Kicker } from "@/components/home/kit/primitives";
import { ctaLargeClass, ghostLargeDarkClass } from "@/components/home/kit/styles";
import { Reveal } from "@/components/motion/reveal";
import { NAV_ICONS } from "@/components/nav/nav-icons";
import { SiteHeader } from "@/components/nav/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { getHeaderAuth } from "@/lib/auth/profile";
import { marketingFontVars } from "@/lib/fonts";
import { PRODUCTS, productHref, type Product, type ProductSlug } from "@/lib/product-content";
import { cn } from "@/lib/utils";

/*
 * The shared shape of every /product/* page:
 *   hero → chapters → how it works → works with → CTA.
 * Pages stay dark end to end; chapters alternate between two near-black
 * surfaces so the rhythm comes from surface shifts and hairlines, not colour.
 */

export async function ProductShell({ children }: { children: React.ReactNode }) {
  const auth = await getHeaderAuth();
  return (
    <>
      <SiteHeader auth={auth} />
      <main id="content" className={cn(marketingFontVars, "flex-1 overflow-x-clip bg-ink font-display text-white")}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

/* --------------------------------- Hero --------------------------------- */

export function ProductHero({
  product,
  title,
  body,
  facts,
  visual,
}: {
  product: Product;
  title: React.ReactNode;
  body: string;
  facts: { title: string; body: string }[];
  visual: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-ink pt-32 sm:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(255_255_255/0.07),transparent_70%)]"
      />
      <Container wide className="relative">
        <nav aria-label="Breadcrumb" className="animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
          <ol className="flex items-center gap-2 font-tech text-[12px] tracking-[0.12em] text-white/45 uppercase">
            <li>Product</li>
            <li aria-hidden className="text-white/25">
              /
            </li>
            <li aria-current="page" className="flex items-center gap-2 text-white/80">
              <ProductIcon slug={product.slug} className="size-3.5 text-brand" />
              {product.name}
            </li>
          </ol>
        </nav>
        <h1 className="mt-6 max-w-[1100px] animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_80ms_both] font-display text-[42px] leading-[1] font-semibold tracking-[-0.048em] text-balance sm:text-[60px] lg:text-[76px]">
          {title}
        </h1>
        <div className="mt-8 flex animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_180ms_both] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[560px] text-[17px] leading-[1.6] text-zinc-400 sm:text-[19px]">{body}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/signup" className={ctaLargeClass}>
              Get started
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link href="/#contact" className={ghostLargeDarkClass}>
              Talk to sales
            </Link>
          </div>
        </div>

        <div className="mt-14 animate-[tz-rise_1.1s_cubic-bezier(0.22,1,0.36,1)_300ms_both] sm:mt-20">{visual}</div>

        <ul className="mt-16 grid gap-8 border-t border-white/[0.08] pt-10 pb-24 sm:mt-20 sm:grid-cols-3 sm:pb-32">
          {facts.map((fact) => (
            <li key={fact.title}>
              <p className="text-[15px] font-medium">{fact.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{fact.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ------------------------------- Chapters ------------------------------- */

const SURFACE = {
  base: "bg-ink",
  raised: "bg-[#0e0e10]",
} as const;

export function Chapter({
  id,
  index,
  kicker,
  title,
  body,
  facts,
  visual,
  surface = "base",
  layout = "split",
  reverse = false,
}: {
  id?: string;
  index: string;
  kicker: string;
  title: React.ReactNode;
  body: string;
  facts?: string[];
  visual: React.ReactNode;
  surface?: keyof typeof SURFACE;
  /** "split": copy beside the visual. "stacked": copy above a wide visual. */
  layout?: "split" | "stacked";
  reverse?: boolean;
}) {
  const copy = (
    <Reveal className={cn(layout === "stacked" && "lg:grid lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20")}>
      <div>
        <Kicker index={index}>{kicker}</Kicker>
        <h2 className="mt-5 font-display text-[34px] leading-[1.04] font-semibold tracking-[-0.04em] text-balance sm:text-[44px] lg:text-[52px]">
          {title}
        </h2>
        <p className="mt-5 max-w-lg text-[17px] leading-[1.6] text-zinc-400">{body}</p>
      </div>
      {facts?.length ? (
        <ul className={cn("mt-8 space-y-3", layout === "stacked" && "lg:mt-0")}>
          {facts.map((fact) => (
            <li key={fact} className="flex gap-3 text-[15px] leading-relaxed text-zinc-300">
              <Check aria-hidden className="mt-[3px] size-4 shrink-0 text-brand" />
              {fact}
            </li>
          ))}
        </ul>
      ) : null}
    </Reveal>
  );

  return (
    <section
      id={id}
      className={cn("relative scroll-mt-16 border-t border-white/[0.06] py-24 sm:py-32", SURFACE[surface])}
    >
      <Container wide>
        {layout === "split" ? (
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <div className={cn(reverse && "lg:order-2")}>{copy}</div>
            <div className={cn("min-w-0", reverse && "lg:order-1")}>{visual}</div>
          </div>
        ) : (
          <>
            {copy}
            <div className="mt-14 min-w-0 sm:mt-16">{visual}</div>
          </>
        )}
      </Container>
    </section>
  );
}

/* ------------------------------ How it works ----------------------------- */

export function HowItWorks({
  title,
  steps,
}: {
  title: React.ReactNode;
  steps: { title: string; body: string }[];
}) {
  return (
    <section className="border-t border-white/[0.06] bg-[#0e0e10] py-24 sm:py-32">
      <Container wide>
        <Reveal>
          <Kicker>How it works</Kicker>
          <h2 className="mt-5 max-w-3xl font-display text-[34px] leading-[1.04] font-semibold tracking-[-0.04em] text-balance sm:text-[44px]">
            {title}
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative border-t border-white/[0.1] pt-6">
              <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-brand" />
              <p className="font-tech text-[12px] tracking-[0.1em] text-white/40">0{i + 1}</p>
              <p className="mt-3 text-[19px] font-medium tracking-[-0.015em]">{step.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ------------------------------ Works with ------------------------------ */

export function ProductIcon({ slug, className }: { slug: ProductSlug; className?: string }) {
  const product = PRODUCTS.find((p) => p.slug === slug)!;
  const Icon = NAV_ICONS[product.icon];
  return <Icon aria-hidden className={className} />;
}

export function WorksWith({ current }: { current: ProductSlug }) {
  const others = PRODUCTS.filter((p) => p.slug !== current);
  return (
    <section className="border-t border-white/[0.06] bg-ink py-24 sm:py-32">
      <Container wide>
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Kicker>One platform</Kicker>
            <h2 className="mt-5 font-display text-[34px] leading-[1.04] font-semibold tracking-[-0.04em] sm:text-[44px]">
              Works with the rest of Tazama.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-zinc-400">
            Every product shares the same locations, screens and schedules — set something up once and use it everywhere.
          </p>
        </Reveal>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((product) => (
            <li key={product.slug}>
              <Link
                href={productHref(product.slug)}
                className="group flex h-full flex-col rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.07] transition-[background-color,box-shadow] hover:bg-white/[0.05] hover:ring-white/[0.14]"
              >
                <span className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-white/75 ring-1 ring-white/[0.08]">
                    <ProductIcon slug={product.slug} className="size-[18px]" />
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-white/30 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  />
                </span>
                <span className="mt-8 text-[17px] font-medium tracking-[-0.015em]">{product.name}</span>
                <span className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{product.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ---------------------------------- CTA ---------------------------------- */

export function ProductCta({ title, body }: { title: React.ReactNode; body: string }) {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-1/2 h-[480px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(229_52_46/0.14),transparent_65%)]"
      />
      <Container className="relative text-center">
        <h2 className="mx-auto max-w-3xl font-display text-[38px] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-[56px]">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-zinc-400">{body}</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="/signup" className={ctaLargeClass}>
            Get started
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link href="/#contact" className={ghostLargeDarkClass}>
            Talk to sales
          </Link>
        </div>
      </Container>
    </section>
  );
}
