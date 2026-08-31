import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading flock health: mortality, feed and vaccinations.
 *
 * These three share a shape -- a dated row against a flock -- and a page, so
 * they share a module rather than three near-identical ones.
 *
 * The hard rule running through this file: `record_daily_production` owns every
 * row whose `daily_production_id` is set. It deletes and re-inserts them each
 * time a day is saved. So the standalone screens read and write only rows
 * where that column is null, and every query below says so explicitly. Drop
 * the `.is("daily_production_id", null)` filter and /health starts showing
 * rows the farmer cannot safely edit -- and cannot keep.
 *
 * Vaccinations have no such split; nothing else writes them.
 */

export interface HealthRange {
  limit?: number;
  offset?: number;
  flockId?: string;
}

const HEALTH_PAGE_LIMIT = 100;

/** Postgrest returns a to-one join as an object or a single-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type FlockJoin = { name: string } | { name: string }[] | null;

// ---------------------------------------------------------------------------
// Mortality
// ---------------------------------------------------------------------------

export interface MortalityEntry {
  id: string;
  recordDate: string;
  flockId: string;
  flockName: string;
  quantity: number;
  reason: string;
  notes: string;
}

type MortalityJoin = {
  id: string;
  record_date: string;
  flock_id: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  flocks: FlockJoin;
};

const MORTALITY_COLUMNS =
  "id, record_date, flock_id, quantity, reason, notes, flocks!inner(name)";

/** Ad-hoc mortality incidents, newest first. Never the rows a day owns. */
export async function getMortalityRecords(
  farmId: string,
  range: HealthRange = {}
): Promise<MortalityEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("mortality_records")
    .select(MORTALITY_COLUMNS)
    .eq("farm_id", farmId)
    .is("daily_production_id", null)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.flockId) query = query.eq("flock_id", range.flockId);
  const limit = range.limit ?? HEALTH_PAGE_LIMIT;
  query =
    range.offset !== undefined
      ? query.range(range.offset, range.offset + limit - 1)
      : query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error("mortality lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as MortalityJoin[]).map((row) => ({
    id: row.id,
    recordDate: row.record_date,
    flockId: row.flock_id,
    flockName: one(row.flocks)?.name ?? "Unknown",
    quantity: row.quantity,
    reason: row.reason ?? "",
    notes: row.notes ?? "",
  }));
}

export async function getMortalityCount(
  farmId: string,
  range: Pick<HealthRange, "flockId"> = {}
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("mortality_records")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("daily_production_id", null);

  if (range.flockId) query = query.eq("flock_id", range.flockId);

  const { count, error } = await query;

  if (error) {
    logger.error("mortality count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export interface FeedEntry {
  id: string;
  usageDate: string;
  flockId: string;
  flockName: string;
  quantityKg: number;
  costPerKg: number;
  totalCost: number;
  feedType: string;
  notes: string;
}

type FeedJoin = {
  id: string;
  usage_date: string;
  flock_id: string;
  quantity_kg: number;
  cost_per_kg: number;
  total_cost: number;
  feed_type: string | null;
  notes: string | null;
  flocks: FlockJoin;
};

const FEED_COLUMNS =
  "id, usage_date, flock_id, quantity_kg, cost_per_kg, total_cost, feed_type, " +
  "notes, flocks!inner(name)";

/** Ad-hoc feed deliveries, newest first. Never the rows a day owns. */
export async function getFeedUsage(
  farmId: string,
  range: HealthRange = {}
): Promise<FeedEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("feed_usage")
    .select(FEED_COLUMNS)
    .eq("farm_id", farmId)
    .is("daily_production_id", null)
    .order("usage_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.flockId) query = query.eq("flock_id", range.flockId);
  const limit = range.limit ?? HEALTH_PAGE_LIMIT;
  query =
    range.offset !== undefined
      ? query.range(range.offset, range.offset + limit - 1)
      : query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error("feed usage lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as FeedJoin[]).map((row) => ({
    id: row.id,
    usageDate: row.usage_date,
    flockId: row.flock_id,
    flockName: one(row.flocks)?.name ?? "Unknown",
    quantityKg: Number(row.quantity_kg ?? 0),
    costPerKg: Number(row.cost_per_kg ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    feedType: row.feed_type ?? "",
    notes: row.notes ?? "",
  }));
}

export async function getFeedUsageCount(
  farmId: string,
  range: Pick<HealthRange, "flockId"> = {}
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("feed_usage")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("daily_production_id", null);

  if (range.flockId) query = query.eq("flock_id", range.flockId);

  const { count, error } = await query;

  if (error) {
    logger.error("feed usage count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Vaccinations
// ---------------------------------------------------------------------------

export interface VaccinationEntry {
  id: string;
  vaccinationDate: string;
  flockId: string;
  flockName: string;
  vaccineName: string;
  notes: string;
}

type VaccinationJoin = {
  id: string;
  vaccination_date: string;
  flock_id: string;
  vaccine_name: string;
  notes: string | null;
  flocks: FlockJoin;
};

const VACCINATION_COLUMNS =
  "id, vaccination_date, flock_id, vaccine_name, notes, flocks!inner(name)";

export async function getVaccinations(
  farmId: string,
  range: HealthRange = {}
): Promise<VaccinationEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("vaccinations")
    .select(VACCINATION_COLUMNS)
    .eq("farm_id", farmId)
    .order("vaccination_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.flockId) query = query.eq("flock_id", range.flockId);
  const limit = range.limit ?? HEALTH_PAGE_LIMIT;
  query =
    range.offset !== undefined
      ? query.range(range.offset, range.offset + limit - 1)
      : query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error("vaccination lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as VaccinationJoin[]).map((row) => ({
    id: row.id,
    vaccinationDate: row.vaccination_date,
    flockId: row.flock_id,
    flockName: one(row.flocks)?.name ?? "Unknown",
    vaccineName: row.vaccine_name,
    notes: row.notes ?? "",
  }));
}

export async function getVaccinationCount(
  farmId: string,
  range: Pick<HealthRange, "flockId"> = {}
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("vaccinations")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (range.flockId) query = query.eq("flock_id", range.flockId);

  const { count, error } = await query;

  if (error) {
    logger.error("vaccination count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

/**
 * The latest vaccination per active flock, for the alerts feed.
 *
 * Reads the whole farm's vaccination history once and reduces in memory rather
 * than issuing one query per flock. A farm has tens of these, not thousands.
 */
export async function getLatestVaccinationByFlock(
  farmId: string
): Promise<Map<string, string>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vaccinations")
    .select("flock_id, vaccination_date")
    .eq("farm_id", farmId)
    .order("vaccination_date", { ascending: false });

  if (error) {
    logger.error("latest vaccination lookup failed", { reason: error.message });
    return new Map();
  }

  const latest = new Map<string, string>();
  for (const row of (data ?? []) as { flock_id: string; vaccination_date: string }[]) {
    // Rows arrive newest first, so the first sighting of a flock wins.
    if (!latest.has(row.flock_id)) latest.set(row.flock_id, row.vaccination_date);
  }

  return latest;
}
