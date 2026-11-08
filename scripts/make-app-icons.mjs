// The app icons (home screen, install prompt, splash, shortcuts), drawn from src/app/icon.svg. Run after changing the
// logo: `node scripts/make-app-icons.mjs`, then commit the PNGs (builds never run this). Uses sharp, which next installs.
//   public/icons/icon-192.png, icon-512.png            the rounded tile, transparent corners ("any")
//   public/icons/icon-maskable-192.png, -512.png       full-bleed ink, the mark inside the 80% safe zone ("maskable")
//   public/icons/shortcut-{deals,sell,watchlist}.png   96 px glyphs for the manifest's shortcuts
//   src/app/apple-icon.png                             180 px full-bleed (iOS rounds the corners itself)
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let sharp;
try {
  sharp = createRequire(import.meta.url)("sharp");
} catch {
  console.error("sharp isn't installed (it comes with next): run npm install first.");
  process.exit(1);
}
const INK = "#141c33";
const CREAM = "#faf8f3";
const svg = (await readFile(path.join(root, "src/app/icon.svg"), "utf8")).trim();
// The mark without its rounded tile.
const mark = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/<rect width="32" height="32"[^>]*\/>/, "");
if (mark === svg || !mark.includes("<path")) throw new Error("src/app/icon.svg changed shape: update scripts/make-app-icons.mjs");
const tile = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${INK}"/>` +
  `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${mark}</g></svg>`;
// Lucide outlines (24-unit grid): search, tag, heart.
const GLYPHS = {
  deals: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sell: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  watchlist: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
};
const shortcut = (glyph) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${INK}"/>` +
  `<g transform="translate(12 12)" fill="none" stroke="${CREAM}" color="${CREAM}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
const png = (source, size, file, opaque = false) => {
  // Drawn at twice the size, then scaled down: crisp edges at 512 px too (the SVG's own size is its viewBox).
  const box = Number(/viewBox="0 0 (\d+)/.exec(source)?.[1] ?? 32);
  let img = sharp(Buffer.from(source), { density: Math.ceil((72 * 2 * size) / box) }).resize(size, size);
  if (opaque) img = img.flatten({ background: INK });
  return img.png({ compressionLevel: 9 }).toFile(path.join(root, file));
};

await mkdir(path.join(root, "public/icons"), { recursive: true });
await png(svg, 192, "public/icons/icon-192.png");
await png(svg, 512, "public/icons/icon-512.png");
await png(tile(0.84), 192, "public/icons/icon-maskable-192.png", true);
await png(tile(0.84), 512, "public/icons/icon-maskable-512.png", true);
await png(tile(1), 180, "src/app/apple-icon.png", true);
for (const [name, glyph] of Object.entries(GLYPHS)) await png(shortcut(glyph), 96, `public/icons/shortcut-${name}.png`);
console.log("App icons written to public/icons and src/app/apple-icon.png");
