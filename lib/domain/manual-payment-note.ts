/**
 * Stable per-account code, e.g. "LF-3F2A1B" -- shown to copy into GCash's own
 * note field while sending money, and stored on the manual_payments row at
 * submission (app/(app)/checkout/actions.ts) so an admin can compare it
 * against what actually shows up in their GCash app before approving.
 *
 * Deterministic from `ownerId` alone: the same account always gets the same
 * code, so nothing needs to be generated or stored ahead of time, and it
 * survives a page reload mid-checkout. It's a reconciliation hint the admin
 * still cross-checks against payer name, amount, and the receipt image, not
 * a uniqueness guarantee.
 */
export function generatePaymentNote(ownerId: string): string {
  const hex = ownerId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `LF-${hex}`;
}
