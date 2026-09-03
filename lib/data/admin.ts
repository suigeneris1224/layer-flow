import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS } from "@/lib/data/audit";
import { logger } from "@/lib/observability/logger";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Cross-tenant reads for the platform-admin monitoring page
 * (app/admin/, gated by lib/auth/admin.ts).
 *
 * Every other lib/data/ module is farm-scoped by RLS. This one deliberately
 * is not -- it exists specifically to see every farm at once, which is why
 * it goes through the service-role client rather than the ordinary one.
 */

export interface AdminFarmRow {
  farmId: string;
  farmName: string;
  ownerEmail: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface SubscriptionJoinRow {
  farm_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  farms: { id: string; name: string; owner_id: string } | { id: string; name: string; owner_id: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Every farm's subscription, soonest-expiring first (nulls -- no period set
 * yet -- last, since there's nothing to act on there).
 *
 * Owner emails come from one `listUsers()` call rather than one
 * `getUserById()` per farm (the pattern lib/data/billing-contacts.ts uses for
 * a single farm) -- fine for one farm, wasteful for every farm at once.
 */
export async function getAllSubscriptions(): Promise<AdminFarmRow[]> {
  const admin = createSupabaseAdminClient();

  const [subscriptionsResult, usersResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("farm_id, plan, status, current_period_end, created_at, farms!inner(id, name, owner_id)"),
    admin.auth.admin.listUsers(),
  ]);

  if (subscriptionsResult.error) {
    logger.error("admin subscriptions lookup failed", { reason: subscriptionsResult.error.message });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  // listUsers() paginates (default page size 50); a growing user base needs
  // this to walk every page, not just the first -- not worth solving before
  // LayerFlow actually has that many accounts.
  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  const rows = ((subscriptionsResult.data ?? []) as unknown as SubscriptionJoinRow[]).map((row) => {
    const farm = one(row.farms);
    return {
      farmId: row.farm_id,
      farmName: farm?.name ?? "Unknown farm",
      ownerEmail: farm ? (emailById.get(farm.owner_id) ?? null) : null,
      plan: row.plan,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
      createdAt: row.created_at,
    };
  });

  return rows.sort((a, b) => {
    if (a.currentPeriodEnd === null) return 1;
    if (b.currentPeriodEnd === null) return -1;
    return a.currentPeriodEnd.localeCompare(b.currentPeriodEnd);
  });
}

export type EmailKind = "receipt" | "past_due_reminder" | "renewal_reminder";
export type EmailTrigger = "manual" | "cron";

export interface AdminEmailLogRow {
  id: string;
  farmId: string;
  farmName: string;
  kind: EmailKind | "unknown";
  to: "self" | "owner" | "unknown";
  trigger: EmailTrigger | "unknown";
  createdAt: string;
}

interface EmailAuditJoinRow {
  id: string;
  farm_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  farms: { name: string } | { name: string }[] | null;
}

/**
 * Every subscription email LayerFlow has sent, newest first -- every send
 * path (lib/email/client.ts's sendEmail, wherever it's called) already
 * writes one of these via recordAuditLog with
 * AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT, so this reads that trail rather
 * than needing a dedicated emails table.
 *
 * `limit` caps this at a flat number rather than real pagination -- fine
 * until a farm count exists that makes 200 rows too few to be useful; not
 * worth solving before that's true.
 */
export async function getEmailLog(limit = 200): Promise<AdminEmailLogRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("audit_logs")
    .select("id, farm_id, metadata, created_at, farms(name)")
    .eq("action", AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("admin email log lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as EmailAuditJoinRow[]).map((row) => {
    const farm = one(row.farms);
    const metadata = row.metadata ?? {};
    return {
      id: row.id,
      farmId: row.farm_id ?? "",
      farmName: farm?.name ?? "Unknown farm",
      kind: (metadata.kind as EmailKind | undefined) ?? "unknown",
      to: (metadata.to as "self" | "owner" | undefined) ?? "unknown",
      trigger: (metadata.trigger as EmailTrigger | undefined) ?? "unknown",
      createdAt: row.created_at,
    };
  });
}
