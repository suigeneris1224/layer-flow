import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";

/**
 * Resolve a farm owner's email address.
 *
 * `profiles`/`farm_members` carry no email column and `auth.users` is not
 * client-readable (see 20250101001200_team.sql), so this is one of the
 * narrow legitimate uses of the service-role client named in its own doc
 * comment: a scheduled job (the subscription-emails cron) or a manual action
 * that needs a farm's owner resolved by farm identity rather than trusted
 * from the caller's own session.
 */
export async function getFarmOwnerEmail(ownerId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(ownerId);

  if (error || !data.user?.email) {
    logger.warn("owner email lookup failed", { reason: error?.message });
    return null;
  }

  return data.user.email;
}
