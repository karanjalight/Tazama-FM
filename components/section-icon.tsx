import {
  Cast,
  Clock,
  Globe,
  LayoutGrid,
  Link2,
  Megaphone,
  Monitor,
  Music,
  Play,
  QrCode,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Tv,
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
  sparkles: Sparkles,
  music: Music,
  monitor: Monitor,
  tv: Tv,
  megaphone: Megaphone,
  target: Target,
  cast: Cast,
  globe: Globe,
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
