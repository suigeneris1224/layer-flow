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
}

interface PendingManualPaymentDbRow extends ManualPaymentDbRow {
  farm_id: string | null;
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
        "id, owner_id, farm_id, plan, billing_period, amount_centavos, payer_name, reference_number, receipt_storage_path, status, created_at, farms(name)"
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
      };
    })
  );
}
