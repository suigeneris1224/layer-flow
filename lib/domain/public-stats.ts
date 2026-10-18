/**
 * The homepage's usage totals: when to show them and how to write them.
 *
 * Same stance as the testimonial spot (components/marketing/testimonial.tsx):
 * only true numbers, and nothing at all until they're worth showing. Big
 * numbers round down, so the page never claims more than is true.
 *
 * Pure module, no I/O.
 */

export interface PublicStats {
  farms: number;
  eggs: number;
  hens: number;
  provinces: number;
}

/** Below this many real farms the section stays hidden. */
export const MIN_FARMS = 2;

export function shouldShowStats(stats: PublicStats | null): stats is PublicStats {
  return stats !== null && stats.farms >= MIN_FARMS;
}

const exact = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

/**
 * "12,400" below 100,000; "350K+" and "1.2M+" above, always rounded down.
 */
export function compactCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  if (n < 100_000) return exact.format(n);
  if (n < 1_000_000) return `${Math.floor(n / 1_000)}K+`;
  const millions = Math.floor(n / 100_000) / 10;
  return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M+`;
}

/** Count-up duration for the homepage tiles. */
export const COUNT_UP_MS = 1500;

/**
 * The value shown `progress` (0-1) of the way through the count-up: eased
 * out, so it slows into the real number, and rounded down so it never
 * passes it.
 */
export function countUpValue(target: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - t) ** 3;
  return Math.floor(Math.max(0, target) * eased);
}
