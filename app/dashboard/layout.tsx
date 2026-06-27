import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { NowPlayingBar } from "@/components/dashboard/now-playing-bar";
import { PlayerProvider } from "@/components/player/player-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.onboardingComplete) redirect("/onboarding");

  const isBusiness = profile.accountType === "business";
  const displayName = isBusiness
    ? (profile.business?.businessName ?? profile.fullName)
    : profile.fullName;
  const secondary = isBusiness
    ? (profile.business?.industry ?? "Business")
    : "Individual";

  return (
    <PlayerProvider>
      <div className="min-h-svh bg-background text-foreground">
        <Sidebar
          name={displayName}
          secondary={secondary}
          email={profile.email}
          accountType={profile.accountType}
          avatarKey={profile.avatarKey}
        />

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-1.5">
            <MobileSidebar
              name={displayName}
              secondary={secondary}
              accountType={profile.accountType}
              avatarKey={profile.avatarKey}
            />
            <Link href="/dashboard" aria-label="Tazama, dashboard">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
            <ProfileMenu
              name={displayName}
              secondary={secondary}
              email={profile.email}
              accountType={profile.accountType}
              avatarKey={profile.avatarKey}
              variant="compact"
            />
          </div>
        </header>

        <main className="px-4 pt-6 pb-32 sm:px-6 lg:px-8">{children}</main>
      </div>

        <NowPlayingBar />
      </div>
    </PlayerProvider>
  );
}
