import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type {
  BillingPeriod,
  ManualPaymentStatus,
  SubscriptionPlan,
} from "@/lib/types/database";

/**
 * Reads for manual QR/bank transfer payments (supabase/migrations/
 * 20250101002600_manual_payments.sql).
 *
 * `getManualPaymentsForOwner` goes through the ordinary RLS-scoped client --
 * a farmer may only ever see their own account's rows anyway. `getPendingManualPayments`
 * is the app/admin/ equivalent of lib/data/admin.ts's other cross-tenant
 * reads: service-role, since it looks across every account at once.
 */

export interface ManualPaymentRow {
  id: string;
  ownerId: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  payerName: string;
  referenceNumber: string;
  status: ManualPaymentStatus;
  createdAt: string;
}

interface ManualPaymentDbRow {
  id: string;
  owner_id: string;
  plan: SubscriptionPlan;
  billing_period: BillingPeriod;
  amount_centavos: number;
  payer_name: string;
  reference_number: string;
  status: ManualPaymentStatus;
  created_at: string;
}

/** This account's manual payments, newest first -- for the /billing "being verified" banner. */
export async function getManualPaymentsForOwner(ownerId: string): Promise<ManualPaymentRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("manual_payments")
    .select(
      "id, owner_id, plan, billing_period, amount_centavos, payer_name, reference_number, status, created_at"
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("manual payments lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as ManualPaymentDbRow[]).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    plan: row.plan,
    billingPeriod: row.billing_period,
    amountCentavos: row.amount_centavos,
    payerName: row.payer_name,
    referenceNumber: row.reference_number,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export interface PendingManualPaymentRow extends ManualPaymentRow {
  ownerEmail: string | null;
  farmName: string | null;
  /** Time-limited (1 hour): the bucket is private, so this is generated per admin-panel load. */
  receiptSignedUrl: string | null;
  /**
   * True when this reference number appears on more than one manual_payments
   * row (any status, any account) -- a real GCash/bank reference number is
   * only ever used once, so a repeat is either an honest resubmission or
   * someone reusing/guessing a reference number they observed elsewhere.
   * Purely a signal for the admin reviewing the receipt, not an automatic
   * rejection -- that call still needs a human looking at the actual proof.
   */
  isDuplicateReference: boolean;
  /** Server-computed at submission (generatePaymentNote) -- compare against
   *  the note on the actual incoming GCash payment before approving. */
  paymentNote: string | null;
}

interface PendingManualPaymentDbRow extends ManualPaymentDbRow {
  farm_id: string | null;
  payment_note: string | null;
  receipt_storage_path: string;
  farms: { name: string } | { name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Every PENDING manual payment, oldest first -- for app/admin/'s review panel. */
export async function getPendingManualPayments(): Promise<PendingManualPaymentRow[]> {
  const admin = createSupabaseAdminClient();

  const [paymentsResult, usersResult] = await Promise.all([
    admin
      .from("manual_payments")
      .select(
        "id, owner_id, farm_id, plan, billing_period, amount_centavos, payer_name, reference_number, payment_note, receipt_storage_path, status, created_at, farms(name)"
      )
      .eq("status", "PENDING")
      .order("created_at", { ascending: true }),
    admin.auth.admin.listUsers(),
  ]);

  if (paymentsResult.error) {
    logger.error("pending manual payments lookup failed", { reason: paymentsResult.error.message });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const rows = (paymentsResult.data ?? []) as unknown as PendingManualPaymentDbRow[];

  // Count every row (any status, any account) sharing each pending row's
  // reference number -- a plain count, not scoped to PENDING, since the
  // scam pattern this catches is reusing a number that was already approved
  // (or rejected) somewhere else, not just a duplicate within the queue.
  const referenceNumbers = [...new Set(rows.map((row) => row.reference_number))];
  const duplicateCounts = new Map<string, number>();
  if (referenceNumbers.length > 0) {
    const { data: matches, error: dupError } = await admin
      .from("manual_payments")
      .select("reference_number")
      .in("reference_number", referenceNumbers);

    if (dupError) {
      logger.error("duplicate reference lookup failed", { reason: dupError.message });
    } else {
      for (const match of matches ?? []) {
        const key = (match as { reference_number: string }).reference_number;
        duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await admin.storage
        .from("manual-payment-receipts")
        .createSignedUrl(row.receipt_storage_path, 60 * 60);

      return {
        id: row.id,
        ownerId: row.owner_id,
        ownerEmail: emailById.get(row.owner_id) ?? null,
        farmName: one(row.farms)?.name ?? null,
        plan: row.plan,
        billingPeriod: row.billing_period,
        amountCentavos: row.amount_centavos,
        payerName: row.payer_name,
        referenceNumber: row.reference_number,
        status: row.status,
        createdAt: row.created_at,
        receiptSignedUrl: signed?.signedUrl ?? null,
        isDuplicateReference: (duplicateCounts.get(row.reference_number) ?? 0) > 1,
        paymentNote: row.payment_note,
      };
    })
  );
}

export interface ManualPaymentHistoryRow extends ManualPaymentRow {
  ownerEmail: string | null;
  farmName: string | null;
  paymentNote: string | null;
  reviewedAt: string | null;
}

interface ManualPaymentHistoryDbRow extends ManualPaymentDbRow {
  payment_note: string | null;
  reviewed_at: string | null;
  farms: { name: string } | { name: string }[] | null;
}

/**
 * Every manual payment (PENDING, APPROVED, REJECTED alike), newest first,
 * optionally bounded by `created_at` -- for app/admin/payment-history/'s
 * bookkeeping view and CSV export. Unlike getPendingManualPayments, this
 * skips signed receipt URLs and duplicate-reference detection: both are
 * per-row storage/query costs that only earn their keep on the small active
 * review queue, not a potentially years-long history list.
 */
export async function getManualPaymentsHistory(window: {
  from?: string;
  to?: string;
}): Promise<ManualPaymentHistoryRow[]> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("manual_payments")
    .select(
      "id, owner_id, farm_id, plan, billing_period, amount_centavos, payer_name, reference_number, payment_note, receipt_storage_path, status, reviewed_at, created_at, farms(name)"
    )
    .order("created_at", { ascending: false });

  if (window.from) query = query.gte("created_at", window.from);
  if (window.to) query = query.lte("created_at", `${window.to}T23:59:59.999Z`);

  const [paymentsResult, usersResult] = await Promise.all([query, admin.auth.admin.listUsers()]);

  if (paymentsResult.error) {
    logger.error("manual payments history lookup failed", { reason: paymentsResult.error.message });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const rows = (paymentsResult.data ?? []) as unknown as ManualPaymentHistoryDbRow[];

  return rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    ownerEmail: emailById.get(row.owner_id) ?? null,
    farmName: one(row.farms)?.name ?? null,
    plan: row.plan,
    billingPeriod: row.billing_period,
    amountCentavos: row.amount_centavos,
    payerName: row.payer_name,
    referenceNumber: row.reference_number,
    status: row.status,
    createdAt: row.created_at,
    paymentNote: row.payment_note,
    reviewedAt: row.reviewed_at,
  }));
}
