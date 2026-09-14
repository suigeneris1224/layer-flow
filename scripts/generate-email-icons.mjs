#!/usr/bin/env node
/**
 * Rasterizes the transactional-email icon set to PNGs under
 * public/icons/email/, one file per (icon, tone) pair.
 *
 * lib/email/layout.ts references these PNGs by name -- inline <svg> doesn't
 * render in Gmail or Outlook (confirmed against real Gmail delivery; only
 * Apple Mail renders inline SVG among major clients), so email icons have to
 * be real hosted images, the same way public/icons/layerflow-logo.png is.
 *
 * This file is the source of truth for the icon shapes. To add or change an
 * icon: edit ICONS below, then run:
 *
 *   npm run email:icons
 *
 * and commit the resulting PNGs alongside the code change.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT_DIR = "public/icons/email";

/**
 * One cohesive line-icon language: 24x24 viewBox, ~1.75 stroke, round
 * caps/joins, no fill (dots that need a fill say so explicitly). Keep new
 * icons to a couple of primitives each -- this is a small glyph set, not an
 * illustration.
 */
const ICONS = {
  egg: `<path d="M12 4c-3.2 4-5 8.3-5 11.2C7 18.8 9.2 21 12 21s5-2.2 5-5.8C17 12.3 15.2 8 12 4z"/>`,
  "check-circle": `<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.5 2.5L16 9"/>`,
  "alert-circle": `<circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none"/>`,
  "alert-triangle": `<path d="M12 4.2L21 19H3L12 4.2z"/><line x1="12" y1="9.7" x2="12" y2="14.2"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/>`,
  refresh: `<path d="M4 12a8 8 0 0114-5.3M20 4v5h-5"/><path d="M20 12a8 8 0 01-14 5.3M4 20v-5h5"/>`,
  box: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><line x1="12" y1="12" x2="12" y2="21"/>`,
  card: `<rect x="3" y="6" width="18" height="13" rx="2.5"/><line x1="3" y1="10.3" x2="21" y2="10.3"/>`,
  calendar: `<rect x="4" y="5" width="16" height="16" rx="2.5"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8.5" y1="3" x2="8.5" y2="7"/><line x1="15.5" y1="3" x2="15.5" y2="7"/>`,
  receipt: `<path d="M6 3h12v17l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2V3z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12.3" x2="15" y2="12.3"/>`,
  note: `<path d="M4 20l.9-3.8L15.5 5.6l2.9 2.9L7.8 19.1 4 20z"/><line x1="13.7" y1="7.4" x2="16.6" y2="10.3"/>`,
  clipboard: `<rect x="6" y="4.3" width="12" height="16.7" rx="2"/><rect x="9" y="2.3" width="6" height="3" rx="1"/><path d="M9 12.3l2 2 4-4.3"/>`,
  chart: `<line x1="5" y1="19" x2="5" y2="12"/><line x1="12" y1="19" x2="12" y2="6"/><line x1="19" y1="19" x2="19" y2="14"/><line x1="3" y1="19.5" x2="21" y2="19.5"/>`,
  users: `<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.3 20c.2-2.6 1.8-4.8 4.2-4.8"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>`,
  chat: `<rect x="3" y="5" width="18" height="12.3" rx="2.5"/><path d="M8 17.3l-1.8 3.2v-3.2"/>`,
  "log-out": `<path d="M13.5 4.5H17a2 2 0 012 2v11a2 2 0 01-2 2h-3.5"/><path d="M10 8l-4 4 4 4"/><line x1="6" y1="12" x2="15.5" y2="12"/>`,
  leaf: `<path d="M4.5 19.5c7.5-1 13-6.5 14-14-7.5 1-13 6.5-14 14z"/><path d="M9 15c2-2 4-4 7.5-7.5"/>`,
};

/** The only two tones any email icon is ever rendered in -- see lib/email/layout.ts. */
const TONES = {
  primary: "#146C3C",
  medium: "#327258",
};

/** 96px source, ~4x the largest on-screen use (28px hero badge) -- crisp on retina. */
const SIZE = 96;
const STROKE_WIDTH = 1.75;

function svgDocument(inner, color) {
  const resolved = inner.replaceAll("currentColor", color);
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${resolved}</svg>`;
}

mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const [name, inner] of Object.entries(ICONS)) {
  for (const [tone, color] of Object.entries(TONES)) {
    const svg = svgDocument(inner, color);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(`${OUT_DIR}/${name}-${tone}.png`, png);
    count++;
  }
}

console.log(`Generated ${count} email icon PNGs in ${OUT_DIR}/`);
