import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import type { Database, Json } from "@/lib/types/database";

/**
 * Append an entry to the farm's audit trail.
 *
 * Deliberately best-effort: a failed audit write must never roll back the
 * farmer's actual record. Failures are logged for us to investigate rather
 * than surfaced to the user, who can do nothing about them.
 *
 * `client` defaults to the request-scoped (cookie-based) server client, which
 * is right for every normal server action. Pass the admin client instead from
 * a context with no user session -- currently only
 * app/api/cron/subscription-emails/route.ts, which also passes `userId: null`
 * since no user acted -- the cron did.
 */
export async function recordAuditLog(
  params: {
    farmId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Json;
  },
  client?: SupabaseClient<Database>
): Promise<void> {
  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const { error } = await supabase.from("audit_logs").insert({
      farm_id: params.farmId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? null,
    });

    if (error) {
      logger.warn("audit log write failed", {
        action: params.action,
        entityType: params.entityType,
        reason: error.message,
      });
    }
  } catch (error) {
    logger.warn("audit log threw", {
      action: params.action,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Actions worth an audit entry. Keeps strings consistent across the app. */
export const AUDIT_ACTIONS = {
  FARM_CREATED: "farm.created",
  FARM_UPDATED: "farm.updated",
  HOUSE_CREATED: "house.created",
  HOUSE_UPDATED: "house.updated",
  HOUSE_DELETED: "house.deleted",
  FLOCK_CREATED: "flock.created",
  FLOCK_UPDATED: "flock.updated",
  FLOCK_RETIRED: "flock.retired",
  EGG_SIZES_CONFIGURED: "egg_sizes.configured",
  PRICES_UPDATED: "egg_prices.updated",
  PRODUCTION_RECORDED: "production.recorded",
  PRODUCTION_UPDATED: "production.updated",
  SALE_RECORDED: "sale.recorded",
  SALE_PAYMENT_RECORDED: "sale.payment_recorded",
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
  CUSTOMER_DELETED: "customer.deleted",
  EXPENSE_RECORDED: "expense.recorded",
  INVENTORY_ADJUSTED: "inventory.adjusted",
  MORTALITY_RECORDED: "mortality.recorded",
  MORTALITY_UPDATED: "mortality.updated",
  MORTALITY_DELETED: "mortality.deleted",
  FEED_RECORDED: "feed.recorded",
  FEED_UPDATED: "feed.updated",
  FEED_DELETED: "feed.deleted",
  VACCINATION_RECORDED: "vaccination.recorded",
  VACCINATION_UPDATED: "vaccination.updated",
  VACCINATION_DELETED: "vaccination.deleted",
  PROFILE_UPDATED: "profile.updated",
  DATA_EXPORTED: "data.exported",
  MEMBER_ADDED: "member.added",
  MEMBER_UPDATED: "member.updated",
  MEMBER_REMOVED: "member.removed",
  PLAN_CHANGED: "subscription.plan_changed",
  ALERT_THRESHOLDS_UPDATED: "alert_thresholds.updated",
  /** metadata carries { kind: "receipt" | "past_due_reminder" | "renewal_reminder", to: "self" | "owner", trigger: "manual" | "cron" }. */
  SUBSCRIPTION_EMAIL_SENT: "subscription.email_sent",
} as const;
