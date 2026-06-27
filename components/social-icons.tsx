import type { SocialKey } from "@/lib/data";

/** Brand glyphs as inline SVG (lucide dropped brand icons). currentColor-driven. */

function Instagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.5 3c.31 2.06 1.5 3.62 3.5 4.02v2.43c-1.27 0-2.55-.4-3.6-1.1v5.9a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6.02.9.07v2.52a3.07 3.07 0 1 0 2.17 2.94V3h2.63z" />
    </svg>
  );
}

function YouTube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22 12c0-1.6-.17-3-.4-3.72-.2-.79-.86-1.41-1.68-1.6C18.3 6.3 12 6.3 12 6.3s-6.3 0-7.92.38c-.82.19-1.48.81-1.68 1.6C2.17 9 2 10.4 2 12s.17 3 .4 3.72c.2.79.86 1.41 1.68 1.6C5.7 17.7 12 17.7 12 17.7s6.3 0 7.92-.38c.82-.19 1.48-.81 1.68-1.6.23-.72.4-2.12.4-3.72zM10 15V9l5.2 3-5.2 3z" />
    </svg>
  );
}

const MAP: Record<SocialKey, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  x: X,
  tiktok: TikTok,
  youtube: YouTube,
};

export function SocialIcon({
  name,
  className,
}: {
  name: SocialKey;
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className} />;
}
