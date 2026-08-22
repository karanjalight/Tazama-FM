import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { SectionIcon } from "@/components/section-icon";
import { buttonVariants } from "@/components/ui/button";
import { solutions } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Media solutions to fit your business
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Explore Tazama’s suite of products – built to work together or individually to meet your unique goals.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="group h-full overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:shadow-none dark:hover:border-white/20">
                <div className="relative aspect-[884/500] overflow-hidden">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-4 left-4 inline-grid size-11 place-items-center rounded-full bg-ink text-white shadow-md ring-4 ring-white/85">
                    <SectionIcon name={s.icon} className="size-5" />
                  </span>
                  {s.status === "soon" ? (
                    <span className="absolute top-4 right-4 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 uppercase shadow-md">
                      Coming soon
                    </span>
                  ) : null}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                  <a
                    href={s.href}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "pill" }),
                      "mt-5",
                    )}
                  >
                    Learn more
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
