#!/usr/bin/env node
/**
 * WCAG contrast checker for the design tokens.
 *
 * Colour is the one part of a design system you cannot eyeball: "looks strong
 * enough" and "passes 4.5:1" are different questions, and this app is used
 * outdoors on cheap screens where the gap matters.
 *
 * Reads the HSL triplets straight out of app/globals.css, so it checks what is
 * actually shipping rather than a copy that can drift.
 *
 *   node scripts/contrast.mjs           # light theme
 *   node scripts/contrast.mjs --dark    # dark theme
 *
 * Exits non-zero if any required pair fails, so it can gate a commit.
 */

import { readFileSync } from "node:fs";

const CSS = readFileSync("app/globals.css", "utf8");
const dark = process.argv.includes("--dark");

/** Pull `--name: h s% l%;` pairs out of the :root or .dark block. */
function readTokens(scope) {
  const start = CSS.indexOf(scope);
  if (start === -1) throw new Error(`Could not find ${scope} in globals.css`);

  const body = CSS.slice(start, CSS.indexOf("\n  }", start));
  const tokens = {};

  for (const [, name, h, s, l] of body.matchAll(
    /--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g
  )) {
    tokens[name] = [Number(h), Number(s), Number(l)];
  }

  return tokens;
}

function hslToRgb([h, s, l]) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  return [r + m, g + m, b + m].map((v) => Math.round(v * 255));
}

/** WCAG relative luminance. */
function luminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hex(rgb) {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const tokens = readTokens(dark ? ".dark {" : ":root {");
const rgb = (name) => {
  if (!tokens[name]) throw new Error(`Token --${name} not found`);
  return hslToRgb(tokens[name]);
};

/**
 * Every pair that carries meaning.
 *
 * `min` is 4.5 for normal text, 3.0 for large text and for non-text elements
 * such as borders and icons (WCAG 1.4.11).
 */
const PAIRS = [
  { label: "body text on page", fg: "foreground", bg: "background", min: 4.5 },
  { label: "body text on panel", fg: "foreground", bg: "surface", min: 4.5 },
  { label: "muted text on page", fg: "muted-foreground", bg: "background", min: 4.5 },
  { label: "muted text on panel", fg: "muted-foreground", bg: "surface", min: 4.5 },
  { label: "white on primary (active pill, buttons)", fg: "primary-foreground", bg: "primary", min: 4.5 },
  { label: "white on destructive", fg: "destructive-foreground", bg: "destructive", min: 4.5 },
  { label: "primary as text on panel (links)", fg: "primary", bg: "surface", min: 4.5 },
  { label: "good status text on panel", fg: "status-good", bg: "surface", min: 4.5 },
  { label: "warn status text on panel", fg: "status-warn", bg: "surface", min: 4.5 },
  { label: "bad status text on panel", fg: "status-bad", bg: "surface", min: 4.5 },
  { label: "chip green text on its tint", fg: "chip-green-fg", bg: "chip-green", min: 4.5 },
  { label: "chip amber text on its tint", fg: "chip-amber-fg", bg: "chip-amber", min: 4.5 },
  { label: "chip teal text on its tint", fg: "chip-teal-fg", bg: "chip-teal", min: 4.5 },
  { label: "chip rose text on its tint", fg: "chip-rose-fg", bg: "chip-rose", min: 4.5 },
  { label: "chip violet text on its tint", fg: "chip-violet-fg", bg: "chip-violet", min: 4.5 },
  /*
   * Non-text (WCAG 1.4.11): only information REQUIRED to identify a component
   * or its state. An input's border qualifies -- surface and background are
   * near-identical whites, so the border is the only thing marking the field.
   * A panel's border does not: the white fill against the tinted page already
   * identifies it, so that one is reported for information only.
   */
  { label: "input border against panel", fg: "input", bg: "surface", min: 3.0 },
  { label: "panel border (decorative)", fg: "border", bg: "surface", min: 0, info: true },
  { label: "chart series 1 on panel", fg: "chart-1", bg: "surface", min: 3.0 },
  { label: "chart series 2 on panel", fg: "chart-2", bg: "surface", min: 3.0 },
];

console.log(`\nWCAG contrast — ${dark ? "DARK" : "LIGHT"} theme\n`);

let failures = 0;

for (const pair of PAIRS) {
  const fg = rgb(pair.fg);
  const bg = rgb(pair.bg);
  const ratio = contrast(fg, bg);
  const pass = ratio >= pair.min;
  if (!pass && !pair.info) failures += 1;

  const verdict = pair.info ? "info" : pass ? "PASS" : "FAIL";
  const needs = pair.info ? "     " : `needs ${pair.min}`;

  console.log(
    `${verdict.padEnd(4)}  ${ratio.toFixed(2).padStart(5)}:1  ` +
      `(${needs})  ${pair.label.padEnd(40)} ${hex(fg)} on ${hex(bg)}`
  );
}

console.log(
  failures === 0
    ? `\nAll ${PAIRS.length} pairs pass.\n`
    : `\n${failures} of ${PAIRS.length} pairs FAIL.\n`
);

process.exit(failures === 0 ? 0 : 1);
