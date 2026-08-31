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

export interface FarmOverview {
  houseCount: number;
  /** Combined capacity of every house, in birds. */
  totalCapacity: number;
  activeFlockCount: number;
  /** Live birds across active flocks, trigger-derived from the mortality ledger. */
  totalBirds: number;
  /** Birds as a share of capacity, 0-100. Null when no capacity is recorded. */
  capacityUsed: number | null;
}

/**
 * The structural picture of a farm: how many houses, how many flocks, how
 * full it is.
 *
 * Deliberately separate from getDashboardData, which is about *today*. This
 * is about the setup, changes rarely, and reads two small tables -- folding
 * it into that function would have meant threading it through 500 lines for
 * no gain, since the page issues both in parallel anyway.
 */
export async function getFarmOverview(farmId: string): Promise<FarmOverview> {
  const supabase = await createSupabaseServerClient();

  const [housesResult, flocksResult] = await Promise.all([
    supabase.from("houses").select("capacity").eq("farm_id", farmId),
    supabase
      .from("flocks")
      .select("current_hens")
      .eq("farm_id", farmId)
      .in("status", ["GROWING", "PRODUCING"]),
  ]);

  for (const result of [housesResult, flocksResult]) {
    if (result.error) {
      logger.error("farm overview lookup failed", { reason: result.error.message });
    }
  }

  const houses = (housesResult.data ?? []) as { capacity: number }[];
  const flocks = (flocksResult.data ?? []) as { current_hens: number }[];

  const totalCapacity = houses.reduce((sum, house) => sum + (house.capacity ?? 0), 0);
  const totalBirds = flocks.reduce((sum, flock) => sum + (flock.current_hens ?? 0), 0);

  return {
    houseCount: houses.length,
    totalCapacity,
    activeFlockCount: flocks.length,
    totalBirds,
    capacityUsed:
      totalCapacity > 0 ? Math.round((totalBirds / totalCapacity) * 1000) / 10 : null,
  };
}
