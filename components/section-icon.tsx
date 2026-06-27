import {
  Clock,
  LayoutGrid,
  Link2,
  Play,
  QrCode,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { IconKey } from "@/lib/data";

const MAP: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  radio: Radio,
  link: Link2,
  play: Play,
  "shield-check": ShieldCheck,
  "qr-code": QrCode,
  clock: Clock,
  "layout-grid": LayoutGrid,
};

export function SectionIcon({
  name,
  className,
}: {
  name: IconKey;
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className} aria-hidden="true" />;
}
