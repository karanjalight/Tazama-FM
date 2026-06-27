import { Logo } from "@/components/brand/logo";
import { SocialIcon } from "@/components/social-icons";
import { footerColumns, socials } from "@/lib/data";

export function SiteFooter() {
  return (
    <footer className="border-t border-transparent bg-ink text-white dark:border-white/10">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo className="text-white" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Vibe &amp; Connect. Social listening for people who&rsquo;d rather
              hear it together.
            </p>
            <div className="mt-6 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="inline-grid size-9 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
                >
                  <SocialIcon name={s.icon} className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-sm font-semibold text-white">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-white/45">
            © 2026 Tazama. Made for people who listen together.
          </p>
          <p className="font-mono text-xs text-white/40">Nairobi · Worldwide</p>
        </div>
      </div>
    </footer>
  );
}
