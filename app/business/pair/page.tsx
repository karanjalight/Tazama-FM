import type { Metadata, Viewport } from "next";
import { PairingCode } from "@/components/business/pairing-code";

export const metadata: Metadata = {
  title: "Pair this device — Tazama Business",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function PairPage() {
  return <PairingCode />;
}
