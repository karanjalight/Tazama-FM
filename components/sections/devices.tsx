import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { RingsMotif } from "@/components/brand/motifs";
import { SectionIcon } from "@/components/section-icon";
import { deviceCompatibility } from "@/lib/data";

export function Devices() {
  return (
    <section className="relative flex min-h-dvh items-center overflow-hidden py-20 text-center text-white">
      <Image
        src="/hero/business-music.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-ink/82" />
      <RingsMotif className="opacity-70" />

      <div className="relative mx-auto w-full max-w-3xl px-5 sm:px-8">
        <Reveal>
          <p className="text-sm font-semibold tracking-wider text-white/45 uppercase">
            Hardware &amp; compatibility
          </p>
          <h2 className="text-display mx-auto mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The right setup for every space
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/65">
            No proprietary hardware to buy — Tazama runs on the screens and
            sound systems you already have, plus a simple kiosk box for
            spaces that need to stay always-on.
          </p>

          <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4 sm:gap-8">
            {deviceCompatibility.map((d) => (
              <div key={d.title} className="flex flex-col items-center">
                <div className="relative grid size-20 place-items-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-white/10 blur-xl"
                  />
                  <span className="relative grid size-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                    <SectionIcon name={d.icon} className="size-7" />
                  </span>
                </div>
                <span className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink">
                  {d.title}
                </span>
                <p className="mt-3 max-w-[14ch] text-xs leading-relaxed text-white/55">
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
