import "server-only";

import { cache } from "react";

import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AlertThresholdOverrides } from "@/lib/domain/alerts";
import { logger } from "@/lib/observability/logger";

/**
 * Per-farm alert threshold overrides (advanced_alerts, Pro only).
 *
 * A thin persistence layer over `alert_thresholds`: shaping rows in and out,
 * nothing else. Plan-gating and default-fallback live in
 * `lib/domain/alerts.ts`'s `resolveThresholds`, not here.
 */

interface AlertThresholdRow {
  production_drop: number | null;
  feed_cost_rise: number | null;
  daily_mortality_rate: number | null;
  egg_size_shift: number | null;
  vaccination_gap_days: number | null;
  low_inventory_trays: number | null;
  stale_pricing_days: number | null;
  underperformance_pct: number | null;
  loss_threshold_pesos: number | null;
}

const COLUMNS =
  "production_drop, feed_cost_rise, daily_mortality_rate, egg_size_shift, " +
  "vaccination_gap_days, low_inventory_trays, stale_pricing_days, " +
  "underperformance_pct, loss_threshold_pesos";

function fromRow(row: AlertThresholdRow): AlertThresholdOverrides {
  return {
    productionDrop: row.production_drop === null ? null : Number(row.production_drop),
    feedCostRise: row.feed_cost_rise === null ? null : Number(row.feed_cost_rise),
    dailyMortalityRate:
      row.daily_mortality_rate === null ? null : Number(row.daily_mortality_rate),
    eggSizeShift: row.egg_size_shift === null ? null : Number(row.egg_size_shift),
    vaccinationGapDays:
      row.vaccination_gap_days === null ? null : Number(row.vaccination_gap_days),
    lowInventoryTrays:
      row.low_inventory_trays === null ? null : Number(row.low_inventory_trays),
    stalePricingDays: row.stale_pricing_days === null ? null : Number(row.stale_pricing_days),
    underperformancePct:
      row.underperformance_pct === null ? null : Number(row.underperformance_pct),
    lossThresholdPesos:
      row.loss_threshold_pesos === null ? null : Number(row.loss_threshold_pesos),
  };
}

export const getAlertThresholdOverrides = cache(
  async function getAlertThresholdOverrides(
    farmId: string
  ): Promise<AlertThresholdOverrides | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("alert_thresholds")
      .select(COLUMNS)
      .eq("farm_id", farmId)
      .maybeSingle();

    if (error) {
      logger.error("alert threshold lookup failed", { reason: error.message });
      return null;
    }

    return data ? fromRow(data as unknown as AlertThresholdRow) : null;
  }
);

/** Upsert a farm's overrides. Fields omitted from `values` are left unchanged. */
export async function saveAlertThresholds(
  farmId: string,
  values: Partial<AlertThresholdOverrides>
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const row: Record<string, number | null> = {};
  if ("productionDrop" in values) row.production_drop = values.productionDrop ?? null;
  if ("feedCostRise" in values) row.feed_cost_rise = values.feedCostRise ?? null;
  if ("dailyMortalityRate" in values) {
    row.daily_mortality_rate = values.dailyMortalityRate ?? null;
  }
  if ("eggSizeShift" in values) row.egg_size_shift = values.eggSizeShift ?? null;
  if ("vaccinationGapDays" in values) {
    row.vaccination_gap_days = values.vaccinationGapDays ?? null;
  }
  if ("lowInventoryTrays" in values) {
    row.low_inventory_trays = values.lowInventoryTrays ?? null;
  }
  if ("stalePricingDays" in values) row.stale_pricing_days = values.stalePricingDays ?? null;
  if ("underperformancePct" in values) {
    row.underperformance_pct = values.underperformancePct ?? null;
  }
  if ("lossThresholdPesos" in values) {
    row.loss_threshold_pesos = values.lossThresholdPesos ?? null;
  }

  const { error } = await supabase
    .from("alert_thresholds")
    .upsert({ farm_id: farmId, ...row, updated_at: new Date().toISOString() }, { onConflict: "farm_id" });

  return { error };
}
