import "server-only";

import { cache } from "react";

import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Per-farm defaults pre-filled into the "add a house" / "add a flock" forms.
 *
 * A thin persistence layer over `farm_defaults`, same shape as
 * lib/data/alert-thresholds.ts: shaping rows in and out, nothing else. There
 * is no fallback-constant layer here (unlike alert_thresholds' THRESHOLDS) --
 * see the migration's comment for why.
 */

export interface FarmDefaults {
  houseCapacity: number | null;
  flockBreed: string | null;
}

interface FarmDefaultsRow {
  default_house_capacity: number | null;
  default_flock_breed: string | null;
}

const EMPTY: FarmDefaults = { houseCapacity: null, flockBreed: null };

export const getFarmDefaults = cache(async function getFarmDefaults(
  farmId: string
): Promise<FarmDefaults> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("farm_defaults")
    .select("default_house_capacity, default_flock_breed")
    .eq("farm_id", farmId)
    .maybeSingle();

  if (error) {
    logger.error("farm defaults lookup failed", { reason: error.message });
    return EMPTY;
  }
  if (!data) return EMPTY;

  const row = data as FarmDefaultsRow;
  return {
    houseCapacity: row.default_house_capacity,
    flockBreed: row.default_flock_breed,
  };
});

/** Upsert a farm's defaults. Both fields are always written (a blank field means "clear it"). */
export async function saveFarmDefaults(
  farmId: string,
  values: FarmDefaults
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("farm_defaults").upsert(
    {
      farm_id: farmId,
      default_house_capacity: values.houseCapacity,
      default_flock_breed: values.flockBreed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "farm_id" }
  );

  return { error };
}
