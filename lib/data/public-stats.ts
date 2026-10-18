import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { PublicStats } from "@/lib/domain/public-stats";

/**
 * Totals across every real farm, for the homepage (public.public_stats).
 * The team's own and test accounts (ADMIN_EMAILS) are left out. Service
 * role only -- the function isn't callable by anon or signed-in users.
 * Never throws: on failure the section just doesn't show.
 */
export async function getPublicStats(): Promise<PublicStats | null> {
  const { data, error } = await createSupabaseAdminClient().rpc("public_stats", {
    p_excluded_emails: serverEnv.adminEmails,
  });
  if (error) {
    logger.error("public stats lookup failed", { reason: error.message });
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    farms: Number(row.farms),
    eggs: Number(row.eggs),
    hens: Number(row.hens),
    provinces: Number(row.provinces),
  };
}
