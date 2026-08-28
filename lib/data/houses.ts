import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading houses.
 *
 * Onboarding writes exactly one house and never reads it back. Everything
 * here exists so a farmer can see and manage houses after that first one.
 */

export interface HouseListEntry {
  id: string;
  name: string;
  capacity: number;
  notes: string;
  /** Every flock ever assigned here, active or retired -- what blocks delete. */
  flockCount: number;
  activeFlockCount: number;
}

export interface HouseDetail {
  id: string;
  name: string;
  capacity: number;
  notes: string;
}

export async function getHouses(farmId: string): Promise<HouseListEntry[]> {
  const supabase = await createSupabaseServerClient();

  const [houses, flocks] = await Promise.all([
    supabase
      .from("houses")
      .select("id, name, capacity, notes")
      .eq("farm_id", farmId)
      .order("name"),
    supabase.from("flocks").select("house_id, status").eq("farm_id", farmId),
  ]);

  if (houses.error) logger.error("house lookup failed", { reason: houses.error.message });
  if (flocks.error) {
    logger.error("flock lookup for houses failed", { reason: flocks.error.message });
  }

  const counts = new Map<string, { total: number; active: number }>();
  for (const row of flocks.data ?? []) {
    const entry = counts.get(row.house_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (row.status === "GROWING" || row.status === "PRODUCING") entry.active += 1;
    counts.set(row.house_id, entry);
  }

  return (houses.data ?? []).map((house) => ({
    id: house.id,
    name: house.name,
    capacity: house.capacity,
    notes: house.notes ?? "",
    flockCount: counts.get(house.id)?.total ?? 0,
    activeFlockCount: counts.get(house.id)?.active ?? 0,
  }));
}

export async function getHouse(farmId: string, houseId: string): Promise<HouseDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("houses")
    .select("id, name, capacity, notes")
    .eq("farm_id", farmId)
    .eq("id", houseId)
    .maybeSingle();

  if (error) {
    logger.error("house detail lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return { id: data.id, name: data.name, capacity: data.capacity, notes: data.notes ?? "" };
}

export async function getHouseCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("houses")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (error) {
    logger.error("house count failed", { reason: error.message });
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}

/**
 * Whether any flock -- active or retired -- has ever pointed at this house.
 *
 * `flocks.house_id` is `ON DELETE RESTRICT` with no status filter, so this
 * check must match that exactly: a house with only SOLD/CLOSED flocks is
 * still undeletable at the database level, and the precheck must agree before
 * the farmer ever presses delete.
 */
export async function houseHasFlocks(farmId: string, houseId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("flocks")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .eq("house_id", houseId);

  if (error) {
    logger.error("house flock check failed", { reason: error.message });
    // Fail closed: an unknown state must not read as "safe to delete".
    return true;
  }

  return (count ?? 0) > 0;
}
