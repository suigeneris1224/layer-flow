import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import type { ManualPaymentHistoryRow } from "@/lib/data/manual-payments";
import type { PaymongoPaymentHistoryRow } from "@/lib/data/paymongo-payments";

/**
 * One row shape for /admin/payment-history and its CSV export, merging
 * manual (GCash QR, human-reviewed) and PayMongo (automated, webhook-
 * confirmed) payments -- an admin wants "all money that came in," not two
 * separate lists. Pure merge/sort logic, no I/O, so it's cheap to test.
 */
export interface PaymentHistoryRow {
  id: string;
  source: "manual" | "paymongo";
  createdAt: string;
  /** Manual only -- what the farmer typed on the submission form. */
  payerName: string | null;
  ownerEmail: string | null;
  farmName: string | null;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  /** Manual only. */
  referenceNumber: string | null;
  /** Manual only -- the per-account reconciliation code. */
  paymentNote: string | null;
  /** ManualPaymentStatus or PaymongoPaymentStatus, kept as a plain string since the two enums differ. */
  status: string;
  /** When a human reviewed it (manual) or PayMongo confirmed payment (paymongo). */
  settledAt: string | null;
}

export function mergePaymentHistory(
  manual: readonly ManualPaymentHistoryRow[],
  paymongo: readonly PaymongoPaymentHistoryRow[]
): PaymentHistoryRow[] {
  const manualRows: PaymentHistoryRow[] = manual.map((row) => ({
    id: row.id,
    source: "manual",
    createdAt: row.createdAt,
    payerName: row.payerName,
    ownerEmail: row.ownerEmail,
    farmName: row.farmName,
    plan: row.plan,
    billingPeriod: row.billingPeriod,
    amountCentavos: row.amountCentavos,
    referenceNumber: row.referenceNumber,
    paymentNote: row.paymentNote,
    status: row.status,
    settledAt: row.reviewedAt,
  }));

  const paymongoRows: PaymentHistoryRow[] = paymongo.map((row) => ({
    id: row.id,
    source: "paymongo",
    createdAt: row.createdAt,
    payerName: null,
    ownerEmail: row.ownerEmail,
    farmName: row.farmName,
    plan: row.plan,
    billingPeriod: row.billingPeriod,
    amountCentavos: row.amountCentavos,
    referenceNumber: null,
    paymentNote: null,
    status: row.status,
    settledAt: row.paidAt,
  }));

  return [...manualRows, ...paymongoRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
