import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { SubscriptionPlan, WaitlistFlockSize } from "@/lib/types/database";

export interface WaitlistEntry {
  ownerId: string;
  ownerEmail: string | null;
  farmName: string;
  mobileNumber: string;
  flockSize: WaitlistFlockSize;
  planWanted: SubscriptionPlan;
  contactConsentAt: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  joinedAt: string;
}

/**
 * Every paid-plan waitlist entry, newest first, for the platform admin
 * (app/admin/waitlist, app/api/export/waitlist). Service-role read: the table
 * only lets an owner see their own row. Owner emails come from one
 * listUsers() call, same as getManualPaymentsHistory.
 */
export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  const admin = createSupabaseAdminClient();

  const [entriesResult, usersResult] = await Promise.all([
    admin
      .from("plan_waitlist")
      .select(
        "owner_id, farm_name, mobile_number, flock_size, plan_wanted, contact_consent_at, trial_started_at, trial_ends_at, created_at"
      )
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers(),
  ]);

  if (entriesResult.error) {
    logger.error("waitlist lookup failed", { reason: entriesResult.error.message });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  return (entriesResult.data ?? []).map((row) => ({
    ownerId: row.owner_id,
    ownerEmail: emailById.get(row.owner_id) ?? null,
    farmName: row.farm_name,
    mobileNumber: row.mobile_number,
    flockSize: row.flock_size,
    planWanted: row.plan_wanted,
    contactConsentAt: row.contact_consent_at,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    joinedAt: row.created_at,
  }));
}
