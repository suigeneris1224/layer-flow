import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import type { CurrentPrice } from "@/lib/domain/pricing";
import { logger } from "@/lib/observability/logger";

/**
 * Reading egg prices.
 *
 * Until this module, `egg_prices` was written during onboarding and never read
 * back. Egg Sales will use `getCurrentPrices` to prefill each sale line.
 */

export interface PricedSize {
  eggSizeId: string;
  name: string;
  code: string;
  sortOrder: number;
  /** Null when this size has never been priced. */
  currentPrice: CurrentPrice | null;
}

export interface PriceHistoryEntry {
  id: string;
  sizeName: string;
  pricePerEgg: number;
  pricePerTray: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface PriceRow {
  id: string;
  egg_size_id: string;
  price_per_egg: number;
  price_per_tray: number;
  effective_from: string;
  effective_to: string | null;
}

function toCurrentPrice(row: PriceRow): CurrentPrice {
  return {
    id: row.id,
    eggSizeId: row.egg_size_id,
    pricePerEgg: Number(row.price_per_egg),
    pricePerTray: Number(row.price_per_tray),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
  };
}

/**
 * Every active egg size with the price in force on `onDate`.
 *
 * A row applies when the date sits inside its range; `effective_to` is
 * inclusive and null means open-ended, matching the exclusion constraint.
 */
export async function getCurrentPrices(
  farmId: string,
  onDate: string
): Promise<PricedSize[]> {
  const supabase = await createSupabaseServerClient();

  const [sizes, prices] = await Promise.all([
    supabase
      .from("egg_sizes")
      .select("id, name, code, sort_order")
      .eq("farm_id", farmId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("egg_prices")
      .select("id, egg_size_id, price_per_egg, price_per_tray, effective_from, effective_to")
      .eq("farm_id", farmId)
      .lte("effective_from", onDate)
      .or(`effective_to.is.null,effective_to.gte.${onDate}`)
      .order("effective_from", { ascending: false }),
  ]);

  if (sizes.error) logger.error("egg size lookup failed", { reason: sizes.error.message });
  if (prices.error) logger.error("egg price lookup failed", { reason: prices.error.message });

  // Ordered newest-first, so the first match per size is the one in force.
  const bySize = new Map<string, CurrentPrice>();
  for (const row of (prices.data ?? []) as PriceRow[]) {
    if (!bySize.has(row.egg_size_id)) bySize.set(row.egg_size_id, toCurrentPrice(row));
  }

  return (sizes.data ?? []).map((size) => ({
    eggSizeId: size.id,
    name: size.name,
    code: size.code,
    sortOrder: size.sort_order,
    currentPrice: bySize.get(size.id) ?? null,
  }));
}

/**
 * The price row a change would affect: the latest open-ended one.
 *
 * Deliberately mirrors what `set_egg_price` picks, so the plan computed in the
 * browser and the plan the database acts on agree.
 */
export async function getOpenPrice(
  farmId: string,
  eggSizeId: string
): Promise<CurrentPrice | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_prices")
    .select("id, egg_size_id, price_per_egg, price_per_tray, effective_from, effective_to")
    .eq("farm_id", farmId)
    .eq("egg_size_id", eggSizeId)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("open price lookup failed", { reason: error.message });
    return null;
  }

  return data ? toCurrentPrice(data as PriceRow) : null;
}

/** Past and scheduled prices, newest first. */
export async function getPriceHistory(context: FarmContext): Promise<PriceHistoryEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_prices")
    .select("id, price_per_egg, price_per_tray, effective_from, effective_to, egg_sizes!inner(name)")
    .eq("farm_id", context.farmId)
    .order("effective_from", { ascending: false })
    .limit(50);

  if (error) {
    logger.error("price history lookup failed", { reason: error.message });
    return [];
  }

  type Joined = PriceRow & { egg_sizes: { name: string } | { name: string }[] };

  return ((data ?? []) as unknown as Joined[]).map((row) => {
    const size = Array.isArray(row.egg_sizes) ? row.egg_sizes[0] : row.egg_sizes;
    return {
      id: row.id,
      sizeName: size?.name ?? "Unknown",
      pricePerEgg: Number(row.price_per_egg),
      pricePerTray: Number(row.price_per_tray),
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
    };
  });
}
