import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
