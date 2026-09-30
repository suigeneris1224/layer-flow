/**
 * Philippine mobile numbers, for the paid-plan waitlist only.
 *
 * Elsewhere phone fields are deliberately free text (lib/validation/schemas.ts:
 * customer and profile phones get written every which way). The waitlist is
 * different: the number is how we reach the farmer at launch, so it has to be
 * a real, dialable mobile.
 */

/**
 * Turns the ways farmers actually write a PH mobile -- "0917 123 4567",
 * "917-123-4567", "63 917 123 4567", "+63.917.123.4567" -- into
 * "+639171234567". Returns null for anything that isn't a 10-digit mobile
 * starting with 9 (landlines and short codes included).
 */
export function normalizePhMobile(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s().-]/g, "");
  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(cleaned);
  return match ? `+63${match[1]}` : null;
}
