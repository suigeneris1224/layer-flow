import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading egg sizes for the Egg Sizes & Pricing settings form.
 *
 * Unlike lib/data/pricing.ts's getCurrentPrices (active sizes only, for
 * pricing/entry screens), this returns every size, active or not -- the
 * management form is the one place a disabled size still needs to show up,
 * so it can be renamed or re-enabled.
 */
export interface ManagedEggSize {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export async function getEggSizesForManagement(farmId: string): Promise<ManagedEggSize[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_sizes")
    .select("id, name, code, sort_order, is_active")
    .eq("farm_id", farmId)
    .order("sort_order");

  if (error) {
    logger.error("egg size management lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}
