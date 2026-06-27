import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BrandAside } from "@/components/auth/brand-aside";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      <BrandAside />

      <div className="flex flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Tazama, home" className="lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="size-4" /> Back to site
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
