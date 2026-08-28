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
