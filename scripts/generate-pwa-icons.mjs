/**
 * Generate the PWA / favicon icon set from the brand mic-mark.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * The mark (matching app/icon.svg) is drawn on an ink (#0a0a0a) background. We
 * emit "any"-purpose icons (mark at ~70%) and a maskable icon (mark at ~56% so
 * Android's adaptive-icon safe zone never crops it), plus the iOS apple-icon.
 * Output is committed — re-run only when the mark changes.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INK = "#0a0a0a";

/** The mic-mark art in a 0..32 coordinate box (mirrors app/icon.svg, sans bg). */
const MARK = `
  <g transform="translate(4 4)">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="#e5342e"/>
    <g stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.95">
      <line x1="10" y1="5.4" x2="14" y2="5.4"/>
      <line x1="10" y1="7.5" x2="14" y2="7.5"/>
      <line x1="10" y1="9.6" x2="14" y2="9.6"/>
    </g>
    <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="#e5342e" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="#e5342e" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="22" x2="16" y2="22" stroke="#e5342e" stroke-width="1.8" stroke-linecap="round"/>
  </g>`;

/** Build an SVG: ink square (optional rounded corners) + the centered mark. */
function iconSvg(size, markFraction, radius = 0) {
  const mark = size * markFraction;
  const pad = (size - mark) / 2;
  const scale = mark / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
    <g transform="translate(${pad} ${pad}) scale(${scale})">${MARK}</g>
  </svg>`;
}

async function emit(svg, outPath) {
  const abs = resolve(ROOT, outPath);
  await mkdir(dirname(abs), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(abs);
  console.log("✓", outPath);
}

await emit(iconSvg(192, 0.7, 36), "public/icons/icon-192.png");
await emit(iconSvg(512, 0.7, 96), "public/icons/icon-512.png");
// Maskable: full-bleed ink, tighter mark so the adaptive safe zone never crops.
await emit(iconSvg(512, 0.56, 0), "public/icons/icon-maskable-512.png");
// iOS apple-touch-icon (iOS rounds it itself — keep square, no transparency).
await emit(iconSvg(180, 0.7, 0), "app/apple-icon.png");

console.log("Done.");
