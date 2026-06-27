import { Reveal } from "@/components/motion/reveal";
import { SectionIcon } from "@/components/section-icon";
import { steps } from "@/lib/data";

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps to a shared song
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            No downloads, no friction. From idea to in-sync in under a minute.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="group h-full rounded-3xl border border-border bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:shadow-none dark:hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="inline-grid size-11 place-items-center rounded-2xl bg-foreground text-background">
                    <SectionIcon name={step.icon} className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-zinc-300 dark:text-zinc-700">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
