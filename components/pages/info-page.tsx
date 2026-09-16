import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";

import { Container, Kicker } from "@/components/home/kit/primitives";
import { ctaLargeClass, ghostLargeDarkClass } from "@/components/home/kit/styles";
import { Reveal } from "@/components/motion/reveal";
import { NAV_ICONS } from "@/components/nav/nav-icons";
import { ProductCta, ProductShell } from "@/components/product/template";
import type { NavIconKey } from "@/lib/home-content";
import { PRODUCTS, productHref } from "@/lib/product-content";
import { GROUP_LABEL, SITE_PAGES, type SitePage } from "@/lib/site-pages";
import { cn } from "@/lib/utils";

/*
 * Template for the plain-language pages behind the nav (Solutions, Industries,
 * Platform, Resources):
 *   hero → in short → see it in action → good to know → questions → related → CTA.
 * The demo is usually the matching homepage section rendered standalone.
 */

interface LinkCard {
  href: string;
  label: string;
  summary: string;
  icon: NavIconKey;
}

const LINK_INDEX: LinkCard[] = [
  ...PRODUCTS.map((p) => ({ href: productHref(p.slug), label: p.name, summary: p.summary, icon: p.icon })),
  ...SITE_PAGES.map((p) => ({ href: p.href, label: p.label, summary: p.summary, icon: p.icon })),
];

export function InfoPage({
  page,
  demo,
  demoIsSection = false,
  children,
}: {
  page: SitePage;
  /** A live demo — a standalone homepage section, or a panel to be framed. */
  demo?: React.ReactNode;
  /** True when `demo` already renders its own full-width <section>. */
  demoIsSection?: boolean;
  /** Extra content placed after "In short" (e.g. the contact form). */
  children?: React.ReactNode;
}) {
  const related = page.related
    .map((href) => LINK_INDEX.find((l) => l.href === href))
    .filter((l): l is LinkCard => Boolean(l));

  return (
    <ProductShell>
      <InfoHero page={page} />
      <InShort page={page} />

      {children}

      {demo ? (
        demoIsSection ? (
          <div className="border-t border-white/[0.06] bg-ink [&>section]:pt-12 sm:[&>section]:pt-14">
            <DemoLabel />
            {demo}
          </div>
        ) : (
          <section className="border-t border-white/[0.06] bg-[#0e0e10] pb-24 sm:pb-32">
            <DemoLabel />
            <Container wide>{demo}</Container>
          </section>
        )
      ) : null}

      {page.details.length ? <GoodToKnow page={page} /> : null}
      {page.faqs.length ? <Questions page={page} /> : null}
      {related.length ? <Related cards={related} /> : null}

      <ProductCta title={page.cta.title} body={page.cta.body} />
    </ProductShell>
  );
}

function InfoHero({ page }: { page: SitePage }) {
  const Icon = NAV_ICONS[page.icon];
  return (
    <section className="relative overflow-hidden bg-ink pt-32 pb-20 sm:pt-40 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(255_255_255/0.07),transparent_70%)]"
      />
      <Container wide className="relative">
        <nav aria-label="Breadcrumb" className="animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
          <ol className="flex flex-wrap items-center gap-2 font-tech text-[12px] tracking-[0.12em] text-white/45 uppercase">
            <li>{GROUP_LABEL[page.group]}</li>
            <li aria-hidden className="text-white/25">
              /
            </li>
            <li aria-current="page" className="flex items-center gap-2 text-white/80">
              <Icon aria-hidden className="size-3.5 text-brand" />
              {page.label}
            </li>
          </ol>
        </nav>
        <h1 className="mt-6 max-w-[1050px] animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_80ms_both] font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.046em] text-balance sm:text-[58px] lg:text-[72px]">
          {page.title}
          {page.titleAccent ? <span className="text-white/40"> {page.titleAccent}</span> : null}
        </h1>
        <div className="mt-8 grid animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_180ms_both] gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <p className="max-w-[680px] text-[17px] leading-[1.65] text-zinc-300 sm:text-[19px]">{page.lead}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/signup" className={ctaLargeClass}>
              Get started
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            {page.href !== "/contact" ? (
              <Link href="/contact" className={ghostLargeDarkClass}>
                Talk to sales
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}

function InShort({ page }: { page: SitePage }) {
  return (
    <section aria-labelledby="in-short" className="border-t border-white/[0.06] bg-[#0e0e10] py-20 sm:py-24">
      <Container wide>
        <Kicker>
          <span id="in-short">In short</span>
        </Kicker>
        <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {page.inShort.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.06}>
              <div className="relative border-t border-white/[0.1] pt-6">
                <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-brand" />
                <h2 className="text-[19px] font-medium tracking-[-0.015em]">{item.label}</h2>
                <p className="mt-3 text-[16px] leading-[1.7] text-zinc-400">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function DemoLabel() {
  return (
    <Container wide className="pt-16 sm:pt-20">
      <Kicker>See it in action</Kicker>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-500">
        A working preview with example data — the same screens you’ll use in Tazama.
      </p>
    </Container>
  );
}

function GoodToKnow({ page }: { page: SitePage }) {
  return (
    <section aria-labelledby="good-to-know" className="border-t border-white/[0.06] bg-ink py-24 sm:py-28">
      <Container wide>
        <Reveal>
          <Kicker>Good to know</Kicker>
          <h2 id="good-to-know" className="mt-5 max-w-3xl font-display text-[32px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[42px]">
            The details, in plain words.
          </h2>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/[0.07] ring-1 ring-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {page.details.map((d, i) => (
            <li key={d.title} className="bg-ink p-6 sm:p-7">
              <p className="font-tech text-[11px] tracking-[0.1em] text-white/35">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-[17px] font-medium tracking-[-0.01em]">{d.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{d.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Questions({ page }: { page: SitePage }) {
  return (
    <section aria-labelledby="questions" className="border-t border-white/[0.06] bg-[#0e0e10] py-24 sm:py-28">
      <Container wide className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <Reveal>
          <Kicker>Questions</Kicker>
          <h2 id="questions" className="mt-5 font-display text-[32px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[42px]">
            Common questions.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-zinc-400">
            Something else on your mind?{" "}
            <Link href="/contact" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
              Ask our team
            </Link>
            .
          </p>
        </Reveal>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {page.faqs.map((f, i) => (
            <details key={f.q} className="group py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[17px] font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus aria-hidden className="mt-1 size-4 shrink-0 text-white/50 transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-2xl pr-10 text-[15px] leading-[1.7] text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Related({ cards }: { cards: LinkCard[] }) {
  return (
    <section aria-labelledby="related" className="border-t border-white/[0.06] bg-ink py-24 sm:py-28">
      <Container wide>
        <Kicker>Keep exploring</Kicker>
        <h2 id="related" className="mt-5 font-display text-[32px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[42px]">
          Related pages.
        </h2>
        <ul className={cn("mt-12 grid gap-3 sm:grid-cols-2", cards.length >= 4 && "lg:grid-cols-4")}>
          {cards.map((card) => {
            const Icon = NAV_ICONS[card.icon];
            return (
              <li key={card.href}>
                <Link
                  href={card.href}
                  className="group flex h-full flex-col rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.07] transition-[background-color,box-shadow] hover:bg-white/[0.05] hover:ring-white/[0.14]"
                >
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-white/75 ring-1 ring-white/[0.08]">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-white/30 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                    />
                  </span>
                  <span className="mt-8 text-[17px] font-medium tracking-[-0.015em]">{card.label}</span>
                  <span className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{card.summary}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
