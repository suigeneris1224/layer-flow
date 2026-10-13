#!/usr/bin/env node
/**
 * Crop, resize and compress marketing photos into their slots.
 *
 *   npm run photos:optimize
 *
 * Reads originals from marketing-src/ at the repo root (gitignored), named
 * after a slot's file in lib/marketing/photos.ts with any image extension,
 * e.g. `marketing-src/features-hero.png`. Deliberately outside public/:
 * everything under public/ is deployed and publicly reachable. Writes `public/marketing/features-hero.jpg` at
 * the slot's exact width x height (center crop), as a progressive JPEG.
 *
 * Slot sizes are read straight out of photos.ts, so the two can't drift.
 * It does NOT flip `available` -- that stays a deliberate edit, done
 * together with rewriting the alt text to match the chosen image. See
 * docs/marketing-photos.md.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = "marketing-src";
const OUT_DIR = "public/marketing";
const MAX_BYTES = 250 * 1024;

const manifest = readFileSync("lib/marketing/photos.ts", "utf8");
const slots = [
  ...manifest.matchAll(/(\w+):\s*photo\(\s*"([^"]+)",\s*"[^"]*",\s*(\d+),\s*(\d+)\s*(?:,\s*(true|false)\s*)?,?\s*\)/g),
].map(([, key, file, width, height, available]) => ({
  key,
  file,
  width: Number(width),
  height: Number(height),
  available: available === "true",
}));

// Every `key: ` entry in the PHOTOS object must parse -- otherwise a slot
// whose call shape drifted would be skipped as "doesn't match any slot".
const photosBlock = manifest.slice(manifest.indexOf("export const PHOTOS"));
const declared = photosBlock.match(/^ {2}\w+:/gm)?.length ?? 0;
if (slots.length === 0 || slots.length !== declared) {
  console.error(
    `Parsed ${slots.length} of ${declared} photo slots in lib/marketing/photos.ts. ` +
      `Keep every slot as a single photo("file", "alt", width, height[, true]) call.`
  );
  process.exit(1);
}

if (!existsSync(SRC_DIR)) {
  mkdirSync(SRC_DIR, { recursive: true });
  console.log(`Created ${SRC_DIR}/ -- drop originals there, named after their slot file.`);
  process.exit(0);
}

const sources = readdirSync(SRC_DIR).filter((name) => /\.(jpe?g|png|webp|avif|heic)$/i.test(name));
const done = [];

for (const slot of slots) {
  const base = path.parse(slot.file).name;
  const source = sources.find((name) => path.parse(name).name === base);
  if (!source) continue;

  const out = path.join(OUT_DIR, slot.file);
  // Step quality down until the file fits the budget -- photos vary a lot.
  for (const quality of [80, 74, 68, 62]) {
    await sharp(path.join(SRC_DIR, source))
      .rotate() // honour EXIF orientation from phone photos
      .resize(slot.width, slot.height, { fit: "cover", position: "attention" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toFile(out);
    if (statSync(out).size <= MAX_BYTES) break;
  }

  const kb = Math.round(statSync(out).size / 1024);
  console.log(`✓ ${slot.key.padEnd(20)} ${source} → ${out} (${slot.width}×${slot.height}, ${kb} KB)`);
  if (!slot.available) done.push(slot.key);
}

const unknown = sources.filter(
  (name) => !slots.some((slot) => path.parse(slot.file).name === path.parse(name).name)
);
for (const name of unknown) console.warn(`? ${name} doesn't match any slot in photos.ts -- skipped`);

if (done.length > 0) {
  console.log(
    `\nNext: in lib/marketing/photos.ts set available: true and fix the alt text for: ${done.join(", ")}`
  );
}
