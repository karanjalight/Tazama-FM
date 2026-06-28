import { Reveal } from "@/components/motion/reveal";
import { SectionIcon } from "@/components/section-icon";
import { BusinessQRCard } from "@/components/marketing/business-qr-card";
import { buttonVariants } from "@/components/ui/button";
import { businessFeatures } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ForBusiness() {
  return (
    <section id="business" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] bg-ink text-white dark:bg-zinc-900 dark:ring-1 dark:ring-inset dark:ring-white/10">
            <div className="grid items-center gap-12 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
              <div>
                <p className="text-sm font-semibold tracking-wider text-white/45 uppercase">
                  Tazama for Business
                </p>
                <h2 className="text-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Set the mood.
                  <br />
                  Stay legal.
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-white/65">
                  Licensed background music for cafés, gyms, and restaurants —
                  with QR-code song requests your customers actually love.
                </p>

                <ul className="mt-9 grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  {businessFeatures.map((f) => (
                    <li key={f.title} className="flex gap-3.5">
                      <span className="mt-0.5 inline-grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                        <SectionIcon name={f.icon} className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{f.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/55">
                          {f.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <a
                    href="/for-business"
                    className={cn(
                      buttonVariants({ size: "xl" }),
                      "border-transparent bg-white text-ink hover:bg-white/90",
                    )}
                  >
                    Tazama for Business
                  </a>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <BusinessQRCard />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
