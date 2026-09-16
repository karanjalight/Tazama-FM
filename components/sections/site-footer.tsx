import Link from "next/link";
import { BrandLogo } from "@/components/home/kit/brand-logo";
import { marketingFontVars } from "@/lib/fonts";
import { NAV_GROUPS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

/** Marketing footer, shared by the homepage, /for-business and /how-it-works. */
export function SiteFooter() {
  const columns = [
    NAV_GROUPS[0],
    NAV_GROUPS[1],
    NAV_GROUPS[2],
    {
      label: "Company",
      items: [
        { label: "Tazama for Business", href: "/for-business" },
        { label: "Tazama for listeners", href: "/how-it-works" },
        { label: "Contact sales", href: "/#contact" },
        { label: "Sign in", href: "/login" },
      ],
    },
  ];

  return (
    <footer className={cn(marketingFontVars, "border-t border-white/[0.07] bg-ink font-display text-white")}>
      <div className="mx-auto max-w-[1320px] px-5 pt-16 pb-10 sm:px-8 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-[1.3fr_repeat(4,1fr)] lg:gap-8">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link href="/#top" aria-label="Tazama, home" className="inline-block rounded-md">
              <BrandLogo className="h-14" />
            </Link>
            <p className="mt-5 max-w-[260px] text-[14px] leading-relaxed text-white/50">
              Everything your customers see and hear. One platform.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <h2 className="font-tech text-[11px] tracking-[0.12em] text-white/40 uppercase">{col.label}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[14px] text-white/60 transition-colors hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[13px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Tazama. Built in Nairobi.</p>
          <a href="mailto:business@tazama.fm" className="transition-colors hover:text-white">
            business@tazama.fm
          </a>
        </div>
      </div>
    </footer>
  );
}
