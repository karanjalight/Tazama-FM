import Image from "next/image";
import { cn } from "@/lib/utils";
import { coverSeed } from "@/lib/cover-seed";

/**
 * Album cover. Renders a generated image when `src` is provided (hybrid imagery),
 * otherwise a deterministic black/white duotone SVG cover built from the title.
 */
export function Cover({
  src,
  title,
  className,
  sizes = "(max-width: 768px) 45vw, 240px",
  priority = false,
}: {
  src?: string;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl bg-muted",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`${title} — cover art`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <GeneratedCover title={title} />
      )}
    </div>
  );
}

function GeneratedCover({ title }: { title: string }) {
  const { scheme, bars, ringX, ringY, ringR } = coverSeed(title);
  const bg = scheme === "ink" ? "#0a0a0a" : "#f4f4f5";
  const fg = scheme === "ink" ? "#fafafa" : "#0a0a0a";

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${title} cover art`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="100" height="100" fill={bg} />
      {/* vinyl rings */}
      <circle
        cx={ringX}
        cy={ringY}
        r={ringR}
        fill="none"
        stroke={fg}
        strokeWidth="1.4"
        opacity="0.16"
      />
      <circle
        cx={ringX}
        cy={ringY}
        r={ringR * 0.55}
        fill="none"
        stroke={fg}
        strokeWidth="1.4"
        opacity="0.16"
      />
      <circle cx={ringX} cy={ringY} r="2.2" fill={fg} opacity="0.5" />
      {/* equalizer motif */}
      {bars.map((b, i) => {
        const h = b * 56;
        return (
          <rect
            key={i}
            x={14 + i * 11}
            y={88 - h}
            width="7"
            height={h}
            rx="3.5"
            fill={fg}
          />
        );
      })}
    </svg>
  );
}
