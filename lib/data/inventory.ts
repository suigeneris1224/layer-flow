import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import { summariseInventory, type InventoryRow, type InventorySummary } from "@/lib/domain/inventory";
import { logger } from "@/lib/observability/logger";

/**
 * Raw shape of `egg_inventory_balances`.
 *
 * Every column is nullable because Postgres cannot infer NOT NULL through a
 * view, however the query is written.
 */
export interface InventoryBalanceRow {
  egg_size_id: string | null;
  egg_size_name: string | null;
  egg_size_code: string | null;
  sort_order: number | null;
  eggs_produced: number | null;
  eggs_sold: number | null;
  eggs_adjusted: number | null;
  eggs_available: number | null;
}

/** Columns the balances view must supply for `summariseInventory`. */
export const INVENTORY_BALANCE_COLUMNS =
  "egg_size_id, egg_size_name, egg_size_code, sort_order, eggs_produced, eggs_sold, eggs_adjusted, eggs_available";

/**
 * Normalise the view's nullable columns into the domain shape.
 *
 * Rows without an egg size id cannot be rendered or adjusted, so they are
 * dropped. Balances are NOT clamped -- a negative is real and must reach the
 * screen.
 */
export function toInventoryRows(rows: readonly InventoryBalanceRow[]): InventoryRow[] {
  return rows
    .filter((row): row is InventoryBalanceRow & { egg_size_id: string } => row.egg_size_id !== null)
    .map((row) => ({
      eggSizeId: row.egg_size_id,
      name: row.egg_size_name ?? "Unknown",
      code: row.egg_size_code ?? "",
      sortOrder: Number(row.sort_order ?? 0),
      eggsProduced: Number(row.eggs_produced ?? 0),
      eggsSold: Number(row.eggs_sold ?? 0),
      eggsAdjusted: Number(row.eggs_adjusted ?? 0),
      eggsAvailable: Number(row.eggs_available ?? 0),
    }));
}

export interface AdjustmentEntry {
  id: string;
  sizeName: string;
  quantityEggs: number;
  reason: string;
  adjustmentDate: string;
  createdAt: string;
}

export interface InventoryPageData {
  summary: InventorySummary;
  ungradedEggs: number;
  recentAdjustments: AdjustmentEntry[];
}

/** How many recent corrections to show. Enough to spot a mistake, not a ledger. */
const RECENT_ADJUSTMENT_LIMIT = 20;

/**
 * Everything the inventory screen renders, in one round trip set.
 */
export async function getInventoryData(context: FarmContext): Promise<InventoryPageData> {
  const supabase = await createSupabaseServerClient();

  const [balances, grading, adjustments] = await Promise.all([
    supabase
      .from("egg_inventory_balances")
      .select(INVENTORY_BALANCE_COLUMNS)
      .eq("farm_id", context.farmId)
      .order("sort_order"),
    supabase
      .from("egg_grading_summary")
      .select("eggs_ungraded")
      .eq("farm_id", context.farmId)
      .maybeSingle(),
    supabase
      .from("egg_inventory_adjustments")
      .select("id, quantity_eggs, reason, adjustment_date, created_at, egg_sizes!inner(name)")
      .eq("farm_id", context.farmId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ADJUSTMENT_LIMIT),
  ]);

  for (const [label, result] of Object.entries({ balances, grading, adjustments })) {
    if (result.error) {
      logger.error("inventory query failed", { label, reason: result.error.message });
    }
  }

  type AdjustmentJoin = {
    id: string;
    quantity_eggs: number;
    reason: string;
    adjustment_date: string;
    created_at: string;
    egg_sizes: { name: string } | { name: string }[];
  };

  const recentAdjustments = ((adjustments.data ?? []) as unknown as AdjustmentJoin[]).map((row) => {
    const size = Array.isArray(row.egg_sizes) ? row.egg_sizes[0] : row.egg_sizes;
    return {
      id: row.id,
      sizeName: size?.name ?? "Unknown",
      quantityEggs: row.quantity_eggs,
      reason: row.reason,
      adjustmentDate: row.adjustment_date,
      createdAt: row.created_at,
    };
  });

  return {
    summary: summariseInventory(toInventoryRows(balances.data ?? [])),
    ungradedEggs: Math.max(0, Number(grading.data?.eggs_ungraded ?? 0)),
    recentAdjustments,
  };
}

/**
 * Current balance for one size, read fresh.
 *
 * The adjustment guard must never trust a number the browser sent -- it could
 * have been on screen for minutes while stock moved.
 */
export async function getAvailableForSize(
  farmId: string,
  eggSizeId: string
): Promise<{ available: number; sizeName: string } | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_inventory_balances")
    .select("egg_size_name, eggs_available")
    .eq("farm_id", farmId)
    .eq("egg_size_id", eggSizeId)
    .maybeSingle();

  if (error) {
    logger.error("inventory balance lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return {
    available: Number(data.eggs_available ?? 0),
    sizeName: data.egg_size_name ?? "these",
  };
}
