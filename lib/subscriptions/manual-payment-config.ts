/**
 * Manual QR / bank transfer payment details shown on /checkout.
 *
 * Static, like lib/subscriptions/plans.ts's PLANS -- there is exactly one set
 * of receiving accounts for the whole platform, not one per plan or per farm.
 * Fill in the real account details and drop the QR image(s) under /public
 * before shipping this to real customers.
 */

export interface ManualPaymentMethod {
  id: string;
  label: string;
  accountName: string;
  accountNumber: string;
  /** Path under /public, e.g. "/payments/gcash-qr.png". */
  qrImageSrc: string;
}

export const MANUAL_PAYMENT_METHODS: ManualPaymentMethod[] = [
  {
    id: "gcash",
    label: "GCash",
    accountName: "Marlon Sinadjan",
    accountNumber: "0927 365 3513",
    qrImageSrc: "/payments/gcash-qr.png",
  },
  {
    id: "maya",
    label: "Maya",
    accountName: "Marlon Sinadjan",
    accountNumber: "0927 365 3513",
    qrImageSrc: "/payments/maya-qr.png",
  },
  {
    id: "bank",
    label: "Bank Transfer",
    accountName: "Marlon Sinadjan",
    accountNumber: "0012 3456 7890",
    qrImageSrc: "/payments/bank-qr.png",
  },
];
