/**
 * Manual QR / bank transfer payment details shown on /checkout.
 *
 * Static, like lib/subscriptions/plans.ts's PLANS -- there is exactly one set
 * of receiving accounts for the whole platform, not one per plan or per farm.
 * Fill in the real account details and drop the QR image under /public
 * before shipping this to real customers.
 *
 * One QR code, not one per channel -- `MANUAL_PAYMENT_METHODS` stays an
 * array (not a single object) so app/(app)/checkout/manual-qr-payment.tsx
 * doesn't need reshaping if a second method is ever genuinely needed later.
 */

export interface ManualPaymentMethod {
  id: string;
  label: string;
  accountName: string;
  accountNumber: string;
  /** Path under /public, e.g. "/payments/qr.png". */
  qrImageSrc: string;
}

export const MANUAL_PAYMENT_METHODS: ManualPaymentMethod[] = [
  {
    id: "qr",
    label: "Gcash QR",
    accountName: "Marlon Sinadjan",
    accountNumber: "0927 365 3513",
    qrImageSrc: "/payments/qr.png",
  },
];
