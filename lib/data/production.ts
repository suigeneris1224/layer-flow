import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { layingRate } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";

/**
 * Reading daily production.
 *
 * Until now production was write-only: the form recorded a day and the
 * dashboard aggregated it, but nothing listed it back. These readers power
 * /production and /production/[id].
 *
 * Pagination mirrors `getExpenses`/`getExpensesCount` in lib/data/expenses.ts,
 * which in turn mirrors sales -- an append-mostly log read newest first.
 */

export interface ProductionEntry {
  id: string;
  productionDate: string;
  flockId: string;
  flockName: string;
  hensPresent: number;
  eggsCollected: number;
  brokenEggs: number;
  dirtyEggs: number;
  mortality: number;
  /** Derived here so the table and the detail page cannot disagree. */
  layingRate: number;
  /**
   * Collected but not yet assigned to a size -- same figure
   * /production/[id] shows per day, surfaced here too so a farmer can see
   * which day needs sorting without opening each one. Never negative: a
   * breakdown that (incorrectly) exceeds eggsCollected reads as "fully
   * sorted", not as a negative gap.
   */
  ungradedEggs: number;
}

export interface ProductionRange {
  limit?: number;
  offset?: number;
  flockId?: string;
  /**
   * Entitlement cutoff (inclusive). The FREE plan sees `history_days` worth
   * of records; STARTER and PRO pass null and see everything.
   */
  since?: string | null;
}

const PRODUCTION_PAGE_LIMIT = 100;

type ProductionJoin = {
  id: string;
  production_date: string;
  flock_id: string;
  hens_present: number;
  eggs_collected: number;
  broken_eggs: number;
  dirty_eggs: number;
  mortality: number;
  flocks: { name: string } | { name: string }[] | null;
};

/** Postgrest returns a to-one join as an object or a single-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const HISTORY_COLUMNS =
  "id, production_date, flock_id, hens_present, eggs_collected, broken_eggs, " +
  "dirty_eggs, mortality, flocks!inner(name)";

const DAY_COLUMNS = `${HISTORY_COLUMNS}, average_egg_weight, notes`;

/** Recorded days, newest first. */
export async function getProductionHistory(
  farmId: string,
  range: ProductionRange = {}
): Promise<ProductionEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("daily_production")
    .select(HISTORY_COLUMNS)
    .eq("farm_id", farmId)
    .order("production_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.flockId) query = query.eq("flock_id", range.flockId);
  if (range.since) query = query.gte("production_date", range.since);

  const limit = range.limit ?? PRODUCTION_PAGE_LIMIT;
  query =
    range.offset !== undefined
      ? query.range(range.offset, range.offset + limit - 1)
      : query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error("production history lookup failed", { reason: error.message });
    return [];
  }

  const rows = (data ?? []) as unknown as ProductionJoin[];
  const gradedById = await gradedEggsByProductionId(
    supabase,
    rows.map((row) => row.id)
  );

  return rows.map((row) => ({
    id: row.id,
    productionDate: row.production_date,
    flockId: row.flock_id,
    flockName: one(row.flocks)?.name ?? "Unknown",
    hensPresent: row.hens_present,
    eggsCollected: row.eggs_collected,
    brokenEggs: row.broken_eggs,
    dirtyEggs: row.dirty_eggs,
    mortality: row.mortality,
    layingRate: layingRate(row.eggs_collected, row.hens_present),
    ungradedEggs: Math.max(0, row.eggs_collected - (gradedById.get(row.id) ?? 0)),
  }));
}

/**
 * Sum of `daily_egg_size_production.quantity` per production day, for the
 * given ids -- one bounded follow-up query for a whole page rather than one
 * per row. Mirrors `egg_grading_summary` (supabase/migrations/20250101000700_grading_summary.sql),
 * which computes the same "collected minus graded" gap but only as a
 * farm-wide total with no way back to which day it came from.
 */
async function gradedEggsByProductionId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productionIds: string[]
): Promise<Map<string, number>> {
  const graded = new Map<string, number>();
  if (productionIds.length === 0) return graded;

  const { data, error } = await supabase
    .from("daily_egg_size_production")
    .select("daily_production_id, quantity")
    .in("daily_production_id", productionIds);

  if (error) {
    logger.error("graded eggs lookup failed", { reason: error.message });
    return graded;
  }

  for (const row of data ?? []) {
    graded.set(
      row.daily_production_id,
      (graded.get(row.daily_production_id) ?? 0) + row.quantity
    );
  }

  return graded;
}

/** How many days are on record, for pagination. Same filters as the list. */
export async function getProductionCount(
  farmId: string,
  range: Pick<ProductionRange, "flockId" | "since"> = {}
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("daily_production")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (range.flockId) query = query.eq("flock_id", range.flockId);
  if (range.since) query = query.gte("production_date", range.since);

  const { count, error } = await query;

  if (error) {
    logger.error("production count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

/**
 * Whether older records exist beyond an entitlement cutoff.
 *
 * The upgrade prompt on /production should only appear when there is actually
 * something hidden -- a farm three weeks old on the FREE plan is not missing
 * anything and should not be told it is.
 */
export async function countProductionBefore(
  farmId: string,
  cutoff: string,
  flockId?: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("daily_production")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .lt("production_date", cutoff);

  if (flockId) query = query.eq("flock_id", flockId);

  const { count, error } = await query;

  if (error) {
    logger.error("hidden production count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

export interface ProductionSizeLine {
  eggSizeId: string;
  eggSizeName: string;
  quantity: number;
}

export interface ProductionDay extends ProductionEntry {
  averageEggWeight: number | null;
  notes: string;
  sizes: ProductionSizeLine[];
  /** The feed and mortality rows the RPC wrote for this day, if any. */
  feed: { quantityKg: number; costPerKg: number; totalCost: number } | null;
  linkedMortality: { quantity: number; reason: string | null } | null;
}

type SizeJoin = {
  egg_size_id: string;
  quantity: number;
  egg_sizes: { name: string } | { name: string }[] | null;
};

/**
 * One day in full, for the detail page.
 *
 * Supersedes the partial read inside `loadProductionAction`, which skips
 * average_egg_weight and never looks at the linked mortality row.
 */
export async function getProductionDay(
  farmId: string,
  productionId: string
): Promise<ProductionDay | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("daily_production")
    .select(DAY_COLUMNS)
    .eq("farm_id", farmId)
    .eq("id", productionId)
    .maybeSingle();

  if (error) {
    logger.error("production day lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  const row = data as unknown as ProductionJoin & {
    average_egg_weight: number | null;
    notes: string | null;
  };

  const [sizesResult, feedResult, mortalityResult] = await Promise.all([
    supabase
      .from("daily_egg_size_production")
      .select("egg_size_id, quantity, egg_sizes!inner(name)")
      .eq("daily_production_id", productionId),
    supabase
      .from("feed_usage")
      .select("quantity_kg, cost_per_kg, total_cost")
      .eq("daily_production_id", productionId)
      .maybeSingle(),
    supabase
      .from("mortality_records")
      .select("quantity, reason")
      .eq("daily_production_id", productionId)
      .maybeSingle(),
  ]);

  if (sizesResult.error) {
    logger.error("production day sizes lookup failed", {
      reason: sizesResult.error.message,
    });
  }

  const sizes = ((sizesResult.data ?? []) as unknown as SizeJoin[])
    .map((size) => ({
      eggSizeId: size.egg_size_id,
      eggSizeName: one(size.egg_sizes)?.name ?? "Unknown",
      quantity: size.quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const feed = feedResult.data
    ? {
        quantityKg: Number(feedResult.data.quantity_kg ?? 0),
        costPerKg: Number(feedResult.data.cost_per_kg ?? 0),
        totalCost: Number(feedResult.data.total_cost ?? 0),
      }
    : null;

  return {
    id: row.id,
    productionDate: row.production_date,
    flockId: row.flock_id,
    flockName: one(row.flocks)?.name ?? "Unknown",
    hensPresent: row.hens_present,
    eggsCollected: row.eggs_collected,
    brokenEggs: row.broken_eggs,
    dirtyEggs: row.dirty_eggs,
    mortality: row.mortality,
    layingRate: layingRate(row.eggs_collected, row.hens_present),
    ungradedEggs: Math.max(
      0,
      row.eggs_collected - sizes.reduce((sum, size) => sum + size.quantity, 0)
    ),
    averageEggWeight:
      row.average_egg_weight === null ? null : Number(row.average_egg_weight),
    notes: row.notes ?? "",
    sizes,
    feed,
    linkedMortality: mortalityResult.data
      ? {
          quantity: mortalityResult.data.quantity,
          reason: mortalityResult.data.reason,
        }
      : null,
  };
}

/**
 * Whether a flock already has a record for a date.
 *
 * The production form used to decide this from a fixed 45-day window shipped
 * with the page, so a date older than that opened blank and saving it silently
 * overwrote a real day. This asks the database instead.
 */
export async function productionExists(
  farmId: string,
  flockId: string,
  productionDate: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("daily_production")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .eq("flock_id", flockId)
    .eq("production_date", productionDate);

  if (error) {
    logger.error("production existence check failed", { reason: error.message });
    // Fail safe: claiming the day exists makes the form load rather than
    // assume blank, which is the direction that cannot lose data.
    return true;
  }

  return (count ?? 0) > 0;
}
