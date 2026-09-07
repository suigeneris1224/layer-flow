import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import type { BillingPeriod } from "@/lib/types/database";

/**
 * Reading an account's billing period and cadence.
 *
 * Deliberately narrow: `FarmContext` already carries plan/status everywhere
 * they're needed, and widening it just for a "renews on" date used by one
 * settings panel would ripple through every call site. This is that one
 * extra read, kept separate. Subscriptions are account-wide (keyed by
 * `owner_id`), not per farm -- see lib/auth/session.ts's `FarmContext.ownerId`.
 */
export async function getSubscriptionPeriod(
  ownerId: string
): Promise<{ currentPeriodEnd: string | null; billingPeriod: BillingPeriod }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("current_period_end, billing_period")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    logger.error("subscription period lookup failed", { reason: error.message });
    return { currentPeriodEnd: null, billingPeriod: "MONTHLY" };
  }

  return {
    currentPeriodEnd: data?.current_period_end ?? null,
    billingPeriod: data?.billing_period ?? "MONTHLY",
  };
}
