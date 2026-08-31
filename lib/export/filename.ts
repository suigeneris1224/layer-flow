/**
 * Download filenames.
 *
 * The slug is ASCII by construction, which is the point: it means the
 * Content-Disposition header can use a plain `filename="..."` with no RFC 5987
 * `filename*` fallback, and no quote, newline or non-Latin character from a
 * farm's name can ever reach an HTTP header.
 */

const MAX_SLUG = 40;

/**
 * The combining marks NFD separates out, so "Muñoz" slugs to "munoz" rather
 * than losing the letter entirely.
 */
const DIACRITICS = /[̀-ͯ]/g;

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/, "");

  return slug || "farm";
}

/**
 * `layerflow-sales-santos-farm-2026-01-01_to_2026-08-31.csv`, or for the
 * unbounded range `layerflow-sales-santos-farm-all-2026-08-31.csv`.
 */
export function exportFilename(params: {
  dataset: string;
  farmName: string;
  from: string | null;
  to: string;
}): string {
  const farm = slugify(params.farmName);
  const window = params.from ? `${params.from}_to_${params.to}` : `all-${params.to}`;
  return `layerflow-${params.dataset}-${farm}-${window}.csv`;
}
