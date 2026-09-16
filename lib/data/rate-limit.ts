import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  RATE_LIMITS,
  evaluateRateLimit,
  type RateLimitAction,
  type RateLimitDecision,
} from "@/lib/domain/rate-limit";
import { logger } from "@/lib/observability/logger";

/**
 * Consult and record one attempt against `action`'s rate limit for
 * `identifier` (a normalized email, or a farm id for invite -- see
 * lib/domain/rate-limit.ts).
 *
 * Fails open on any Postgres error: a rate-limit outage must never lock a
 * farmer out of their own account. The failure is logged so it can be
 * investigated, matching how lib/data/dashboard.ts's notification sync
 * treats a non-critical side effect.
 */
export async function consumeRateLimit(
  identifier: string,
  action: RateLimitAction
): Promise<RateLimitDecision> {
  const rule = RATE_LIMITS[action];
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();

  const { data, error } = await admin
    .from("rate_limit_hits")
    .select("created_at")
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("created_at", since);

  if (error) {
    logger.error("rate limit lookup failed", { reason: error.message, action });
    return { allowed: true, retryAfterSeconds: null };
  }

  const decision = evaluateRateLimit(
    (data ?? []).map((row) => new Date(row.created_at)),
    rule,
    new Date()
  );
  if (!decision.allowed) return decision;

  const { error: insertError } = await admin
    .from("rate_limit_hits")
    .insert({ identifier, action });
  if (insertError) {
    logger.error("rate limit record failed", { reason: insertError.message, action });
  }

  return decision;
}

/**
 * Drop hits old enough that no rule still cares about them. Called from the
 * existing daily cron (app/api/cron/subscription-emails/route.ts) rather than
 * a new trigger -- rate_limit_hits would otherwise grow forever.
 */
export async function pruneRateLimitHits(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("rate_limit_hits").delete().lt("created_at", cutoff);
  if (error) {
    logger.error("rate limit prune failed", { reason: error.message });
  }
}
