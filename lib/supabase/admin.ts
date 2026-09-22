import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { publicEnv, serverEnv } from "@/lib/config/env";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Legitimate uses are narrow:
 *   - billing webhooks, which have no user session
 *   - scheduled/maintenance jobs
 *   - platform-admin monitoring and overrides (app/admin/), gated by
 *     lib/auth/admin.ts's email allowlist -- a human operator's own
 *     deliberate cross-tenant read *and* write (adminSetSubscriptionAction),
 *     never reachable by a farmer
 *   - the closed-beta signup gate (app/auth/actions.ts's signUpAction), which
 *     necessarily runs before any session exists for RLS to key off of
 *   - the cross-request beta-state cache (lib/subscriptions/beta.ts's
 *     getBetaState, behind unstable_cache), which cannot depend on a caller's
 *     session cookies since its result is shared across requests and users --
 *     safe here because the data itself (a global toggle + up to 5 tester
 *     emails) has no per-user variation and beta_settings is already readable
 *     by any signed-in user under RLS
 *   - rate limiting login/signup/password-reset (lib/data/rate-limit.ts),
 *     same reasoning: those checks run before a session exists, and the
 *     invite rate limit is scoped per farm rather than per acting member
 *   - the cross-request report/analytics caches (lib/data/reports.ts,
 *     lib/data/analytics.ts, lib/data/cross-farm-reports.ts, behind
 *     unstable_cache), same cookie-dependency reasoning as the beta-state
 *     cache above -- these callers keep every `.eq("farm_id", ...)` /
 *     `.in("farm_id", farmIds)` filter RLS would otherwise have enforced, and
 *     are only ever reached after the caller has already verified the
 *     acting user belongs to that farm (requireFarmContext/getUserFarms), so
 *     this moves *what backstops* tenant isolation here, not *who* can
 *     reach it
 *
 * Never reach for this to "make a query work". If a query fails under RLS,
 * that is the policy doing its job -- fix the policy or the access path. Any
 * code using this client is responsible for its own tenant checks, because
 * the database will no longer do them for you.
 *
 * The `server-only` import above makes bundling this into client code a build
 * error rather than a leaked key.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
