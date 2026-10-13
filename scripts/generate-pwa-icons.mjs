#!/usr/bin/env node
/**
 * Generate the PWA / home-screen icons from public/icons/layerflow-logo.png.
 *
 *   npm run icons:pwa
 *
 * The source logo is a transparent 600x517 PNG -- not square -- so every
 * icon here is the logo centred on a white square:
 *
 * - icon-192.png / icon-512.png ("any"): logo box at 94% (the PNG has its own padding).
 * - icon-maskable-512.png: logo box at 80% -- the artwork itself stays inside the circle, because Android
 *   crops maskable icons to a circle/squircle (safe zone is the inner 80%).
 * - apple-touch-icon.png (180): iOS fills transparency with black, so it
 *   must be opaque.
 *
 * Re-run after changing the logo; the manifest's declared sizes must match.
 */

import sharp from "sharp";

const SOURCE = "public/icons/layerflow-logo.png";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const ICONS = [
  { file: "public/icons/icon-192.png", size: 192, scale: 0.94 },
  { file: "public/icons/icon-512.png", size: 512, scale: 0.94 },
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.8 },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.9 },
];

for (const { file, size, scale } of ICONS) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: "centre" }])
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toFile(file);

  console.log(`✓ ${file} (${size}×${size})`);
}
