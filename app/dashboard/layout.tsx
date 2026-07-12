import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { NowPlayingBar } from "@/components/dashboard/now-playing-bar";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
import { PlayerProvider } from "@/components/player/player-provider";
import { NowPlayingPanel } from "@/components/player/now-playing-panel";
import { LikesProvider } from "@/components/likes/likes-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listLikedIds } from "@/lib/likes/store";
import { getPlanForAccount } from "@/lib/billing/subscription";
import { getOrigin } from "@/lib/origin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.onboardingComplete) redirect("/onboarding");

  // Needed by the sidebar's "Create a room" wizard (plan gating + share URLs).
  const [currentPlan, origin, likedIds] = await Promise.all([
    getPlanForAccount(profile.id),
    getOrigin(),
    listLikedIds(profile.id),
  ]);

  const isBusiness = profile.accountType === "business";
  const displayName = isBusiness
    ? (profile.business?.businessName ?? profile.fullName)
    : profile.fullName;
  const secondary = isBusiness
    ? (profile.business?.industry ?? "Business")
    : "Individual";

  return (
    <LikesProvider initialLikedIds={likedIds}>
    <PlayerProvider>
      <div className="min-h-svh bg-background text-foreground">
        <Sidebar
          name={displayName}
          secondary={secondary}
          email={profile.email}
          accountType={profile.accountType}
          avatarKey={profile.avatarKey}
          currentPlan={currentPlan}
          origin={origin}
        />

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-1.5">
            <MobileSidebar
              name={displayName}
              secondary={secondary}
              accountType={profile.accountType}
              avatarKey={profile.avatarKey}
              currentPlan={currentPlan}
              origin={origin}
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

        <DashboardMain>{children}</DashboardMain>
      </div>

        <NowPlayingBar />
        <NowPlayingPanel />
      </div>
    </PlayerProvider>
    </LikesProvider>
  );
}
