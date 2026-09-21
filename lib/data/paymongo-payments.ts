import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type {
  BillingPeriod,
  PaymongoPaymentStatus,
  SubscriptionPlan,
} from "@/lib/types/database";

/**
 * Reads for PayMongo automated payments (supabase/migrations/
 * 20250101003300_paymongo_payments.sql) -- the automated sibling of
 * lib/data/manual-payments.ts. There is no pending-review queue for these:
 * the webhook (app/api/webhooks/paymongo/route.ts) is the sole writer of
 * `status`, so an admin never approves/rejects one by hand. This module only
 * exists for the historical/bookkeeping view.
 */

export interface PaymongoPaymentHistoryRow {
  id: string;
  ownerId: string;
  ownerEmail: string | null;
  farmName: string | null;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  status: PaymongoPaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

interface PaymongoPaymentDbRow {
  id: string;
  owner_id: string;
  farm_id: string | null;
  plan: SubscriptionPlan;
  billing_period: BillingPeriod;
  amount_centavos: number;
  status: PaymongoPaymentStatus;
  created_at: string;
  paid_at: string | null;
  farms: { name: string } | { name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Every PayMongo payment (any status), newest first, optionally bounded by `created_at`. */
export async function getPaymongoPaymentsHistory(window: {
  from?: string;
  to?: string;
}): Promise<PaymongoPaymentHistoryRow[]> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("paymongo_payments")
    .select(
      "id, owner_id, farm_id, plan, billing_period, amount_centavos, status, created_at, paid_at, farms(name)"
    )
    .order("created_at", { ascending: false });

  if (window.from) query = query.gte("created_at", window.from);
  if (window.to) query = query.lte("created_at", `${window.to}T23:59:59.999Z`);

  const [paymentsResult, usersResult] = await Promise.all([query, admin.auth.admin.listUsers()]);

  if (paymentsResult.error) {
    logger.error("paymongo payments history lookup failed", {
      reason: paymentsResult.error.message,
    });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const rows = (paymentsResult.data ?? []) as unknown as PaymongoPaymentDbRow[];

  return rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    ownerEmail: emailById.get(row.owner_id) ?? null,
    farmName: one(row.farms)?.name ?? null,
    plan: row.plan,
    billingPeriod: row.billing_period,
    amountCentavos: row.amount_centavos,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}
