import { SettingsSidebar } from "@/components/business/settings/settings-sidebar";
import { SettingsMobileNav } from "@/components/business/settings/settings-mobile-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <SettingsMobileNav />
      </div>

      <div className="flex items-start gap-8">
        <SettingsSidebar />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
