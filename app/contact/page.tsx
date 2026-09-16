import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { ContactForm } from "@/components/home/final-cta";
import { Container, Kicker } from "@/components/home/kit/primitives";
import { InfoPage } from "@/components/pages/info-page";
import { getSitePage } from "@/lib/site-pages";

const page = getSitePage("resources", "contact")!;

export const metadata: Metadata = {
  title: page.label,
  description: page.metaDescription,
};

export default function ContactPage() {
  return (
    <InfoPage page={page}>
      <section id="contact" aria-labelledby="contact-form" className="scroll-mt-16 border-t border-white/[0.06] bg-ink py-20 sm:py-24">
        <Container wide className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <Kicker>Send us a message</Kicker>
            <h2 id="contact-form" className="mt-5 font-display text-[32px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[42px]">
              Tell us about your venues.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-[1.7] text-zinc-400">
              A few sentences is plenty. Include how many locations and screens you have and what you’d like to run on them.
            </p>
            <a
              href="mailto:business@tazama.fm"
              className="mt-8 inline-flex items-center gap-2 text-[15px] text-white/80 underline decoration-white/25 underline-offset-4 hover:decoration-white"
            >
              <Mail aria-hidden className="size-4" /> business@tazama.fm
            </a>
          </div>
          <ContactForm />
        </Container>
      </section>
    </InfoPage>
  );
}
