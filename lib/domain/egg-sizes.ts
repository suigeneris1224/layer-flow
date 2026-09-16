/**
 * Egg size naming rules.
 *
 * Pure module: no React, no Supabase, no I/O.
 */

/**
 * Derive `egg_sizes.code` from a farmer-typed name.
 *
 * The column is constrained to `^[A-Z0-9_]+$` (20250101000100_production.sql)
 * so charts/exports/RPC params have a stable, ASCII-safe key even when the
 * display name changes later -- "Extra Large" becomes "EXTRA_LARGE", "Pee
 * Wee" becomes "PEE_WEE". Never re-derived on rename: the code is set once at
 * creation and stays put, so renaming a size never breaks anything keyed by
 * its code.
 */
export function slugifyEggSizeCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "SIZE";
}
