"use client";

import { Download } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InstallButton } from "./install-button";
import { useInstall } from "./use-install";

/** "Install Tazama" card for the Settings page. Hidden when not installable. */
export function InstallCard() {
  const { mode } = useInstall();
  if (mode === "loading" || mode === "installed" || mode === "unsupported") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-4 text-brand" />
          Install Tazama
        </CardTitle>
        <CardDescription>
          Add Tazama to your home screen for a full-screen, app-like experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InstallButton label={mode === "ios" ? "How to install" : "Install app"} />
      </CardContent>
    </Card>
  );
}
