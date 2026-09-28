import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { publicEnv, serverEnv } from "@/lib/config/env";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Legitimate uses: billing webhooks and scheduled jobs (no user session),
 * platform-admin overrides (app/admin/, gated by lib/auth/admin.ts's email
 * allowlist), the closed-beta signup gate and cross-request beta-state cache,
 * and pre-session rate limiting (lib/data/rate-limit.ts).
 *
 * Never reach for this to "make a query work" -- a query failing under RLS
 * is the policy doing its job. Code using this client owns its own tenant
 * checks, since the database no longer does them. The `server-only` import
 * above makes bundling this into client code a build error, not a leaked key.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
