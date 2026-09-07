import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/types/database";

/**
 * Reading and counting farms.
 *
 * `getUserFarms` in lib/auth/session.ts already covers "every farm this user
 * belongs to" for the picker; this module covers the single-farm detail view
 * and the plan-limit count, neither of which existed outside onboarding.
 */

/**
 * Every farm this account owns, by name -- for subscription emails, which are
 * account-wide (lib/email/templates.ts) rather than tied to one farm.
 *
 * Optional `client` (mirrors recordAuditLog's pattern) so both a
 * request-scoped caller (billing actions -- RLS allows it, the owner is a
 * member of their own farms) and the subscription-emails cron (service-role
 * client, no session) can reuse this.
 */
export async function getFarmNamesForOwner(
  ownerId: string,
  client?: SupabaseClient<Database>
): Promise<string[]> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("farms")
    .select("name")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("farm names for owner lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => row.name);
}

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
  photoUrl: string | null;
}

export async function getFarmDetail(farmId: string): Promise<FarmDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("farms")
    .select(
      "id, name, barangay, municipality, province, country, timezone, currency, owner_id, photo_url"
    )
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
    photoUrl: data.photo_url,
  };
}

/**
 * The calendar year the farm was created, for the reports year picker.
 *
 * Falls back to the current year on any read failure, so a hiccup here just
 * hides past years from the picker rather than breaking the page.
 */
export async function getFarmStartYear(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const currentYear = new Date().getUTCFullYear();

  const { data, error } = await supabase
    .from("farms")
    .select("created_at")
    .eq("id", farmId)
    .maybeSingle();

  if (error || !data?.created_at) {
    if (error) logger.error("farm start year lookup failed", { reason: error.message });
    return currentYear;
  }

  return new Date(data.created_at).getUTCFullYear();
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

export interface FarmCard {
  farmId: string;
  photoUrl: string | null;
  location: string;
  totalBirds: number;
  houseCount: number;
}

/**
 * The card data for every farm in `farmIds`, for the /farms overview grid.
 *
 * Three grouped queries across all farms rather than one round trip per farm
 * card -- a farmer with several farms would otherwise pay N+1 queries just to
 * open the page.
 */
export async function getFarmCardsForUser(farmIds: string[]): Promise<Record<string, FarmCard>> {
  if (farmIds.length === 0) return {};

  const supabase = await createSupabaseServerClient();

  const [farmsResult, housesResult, flocksResult] = await Promise.all([
    supabase.from("farms").select("id, municipality, province, photo_url").in("id", farmIds),
    supabase.from("houses").select("farm_id").in("farm_id", farmIds),
    supabase
      .from("flocks")
      .select("farm_id, current_hens")
      .in("farm_id", farmIds)
      .in("status", ["GROWING", "PRODUCING"]),
  ]);

  for (const result of [farmsResult, housesResult, flocksResult]) {
    if (result.error) {
      logger.error("farm cards lookup failed", { reason: result.error.message });
    }
  }

  const farms = (farmsResult.data ?? []) as {
    id: string;
    municipality: string;
    province: string;
    photo_url: string | null;
  }[];
  const houses = (housesResult.data ?? []) as { farm_id: string }[];
  const flocks = (flocksResult.data ?? []) as { farm_id: string; current_hens: number }[];

  const houseCounts = new Map<string, number>();
  for (const house of houses) {
    houseCounts.set(house.farm_id, (houseCounts.get(house.farm_id) ?? 0) + 1);
  }

  const birdCounts = new Map<string, number>();
  for (const flock of flocks) {
    birdCounts.set(
      flock.farm_id,
      (birdCounts.get(flock.farm_id) ?? 0) + (flock.current_hens ?? 0)
    );
  }

  const cards: Record<string, FarmCard> = {};
  for (const farm of farms) {
    cards[farm.id] = {
      farmId: farm.id,
      photoUrl: farm.photo_url,
      location: [farm.municipality, farm.province].filter(Boolean).join(", "),
      totalBirds: birdCounts.get(farm.id) ?? 0,
      houseCount: houseCounts.get(farm.id) ?? 0,
    };
  }
  return cards;
}
