import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading and counting farms.
 *
 * `getUserFarms` in lib/auth/session.ts already covers "every farm this user
 * belongs to" for the picker; this module covers the single-farm detail view
 * and the plan-limit count, neither of which existed outside onboarding.
 */

export interface FarmDetail {
  id: string;
  name: string;
  barangay: string;
  municipality: string;
  province: string;
  country: string;
  timezone: string;
  currency: string;
  ownerId: string;
}

export async function getFarmDetail(farmId: string): Promise<FarmDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("farms")
    .select("id, name, barangay, municipality, province, country, timezone, currency, owner_id")
    .eq("id", farmId)
    .maybeSingle();

  if (error) {
    logger.error("farm detail lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    barangay: data.barangay ?? "",
    municipality: data.municipality,
    province: data.province,
    country: data.country,
    timezone: data.timezone,
    currency: data.currency,
    ownerId: data.owner_id,
  };
}

/**
 * How many farms this user already belongs to, for the plan limit.
 *
 * Mirrors `getCustomerCount`'s fail-closed shape: an unknown count must never
 * read as "room for another farm".
 */
export async function getFarmCountForUser(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("farm_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    logger.error("farm count failed", { reason: error.message });
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}
