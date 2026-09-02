import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading a farm's billing period.
 *
 * Deliberately narrow: `FarmContext` already carries plan/status everywhere
 * they're needed, and widening it just for a "renews on" date used by one
 * settings panel would ripple through every call site. This is that one
 * extra read, kept separate.
 */
export async function getSubscriptionPeriod(
  farmId: string
): Promise<{ currentPeriodEnd: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("farm_id", farmId)
    .maybeSingle();

  if (error) {
    logger.error("subscription period lookup failed", { reason: error.message });
    return { currentPeriodEnd: null };
  }

  return { currentPeriodEnd: data?.current_period_end ?? null };
}
