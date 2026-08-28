"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canRecordProduction } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { dailyProductionSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export interface ExistingProduction {
  hensPresent: number;
  eggsCollected: number;
  brokenEggs: number;
  dirtyEggs: number;
  mortality: number;
  notes: string;
  feedKg: number;
  feedCostPerKg: number;
  /** Quantity per egg size id. Sizes with no row are simply absent. */
  sizes: Record<string, number>;
}

/**
 * Load an existing flock-day so the form can be edited rather than retyped.
 *
 * Saving replaces the whole day, so opening a recorded date with blank boxes
 * would silently wipe it. The form calls this whenever the flock or date
 * changes onto a day that already has a record.
 */
export async function loadProductionAction(
  flockId: string,
  productionDate: string
): Promise<ActionResult<ExistingProduction | null>> {
  await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordProduction(context)) {
    return failure("You don't have permission to view production.");
  }

  try {
    const supabase = await createSupabaseServerClient();

    // RLS scopes this to the caller's farms, so a guessed flock id returns
    // nothing rather than another farm's numbers.
    const { data: production, error } = await supabase
      .from("daily_production")
      .select("id, hens_present, eggs_collected, broken_eggs, dirty_eggs, mortality, notes")
      .eq("flock_id", flockId)
      .eq("production_date", productionDate)
      .maybeSingle();

    if (error) return describeDatabaseError(error, "loadProductionAction");
    if (!production) return { ok: true, data: null };

    const [sizesResult, feedResult] = await Promise.all([
      supabase
        .from("daily_egg_size_production")
        .select("egg_size_id, quantity")
        .eq("daily_production_id", production.id),
      supabase
        .from("feed_usage")
        .select("quantity_kg, cost_per_kg")
        .eq("daily_production_id", production.id)
        .maybeSingle(),
    ]);

    const sizes: Record<string, number> = {};
    for (const row of sizesResult.data ?? []) {
      sizes[row.egg_size_id] = row.quantity;
    }

    return {
      ok: true,
      data: {
        hensPresent: production.hens_present,
        eggsCollected: production.eggs_collected,
        brokenEggs: production.broken_eggs,
        dirtyEggs: production.dirty_eggs,
        mortality: production.mortality,
        notes: production.notes ?? "",
        feedKg: Number(feedResult.data?.quantity_kg ?? 0),
        feedCostPerKg: Number(feedResult.data?.cost_per_kg ?? 0),
        sizes,
      },
    };
  } catch (error) {
    return describeUnknownError(error, "loadProductionAction");
  }
}

/**
 * Record or correct one flock-day.
 *
 * Input is re-validated here with the same schema the browser used. Client
 * validation is a courtesy; this is the check that counts.
 */
export async function recordProductionAction(
  input: unknown
): Promise<ActionResult<{ productionId: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordProduction(context)) {
    return failure("You don't have permission to record production.");
  }

  const parsed = dailyProductionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the numbers below.", toFieldErrors(parsed.error));
  }

  const values = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    // One transaction across daily_production, the size breakdown, feed and
    // mortality. The function runs SECURITY INVOKER, so RLS still applies and
    // farm_id is derived from the flock rather than trusted from here.
    const { data: productionId, error } = await supabase.rpc("record_daily_production", {
      p_flock_id: values.flockId,
      p_production_date: values.productionDate,
      p_hens_present: values.hensPresent,
      p_eggs_collected: values.eggsCollected,
      p_broken_eggs: values.brokenEggs,
      p_dirty_eggs: values.dirtyEggs,
      p_mortality: values.mortality,
      p_average_egg_weight:
        values.averageEggWeight === "" || values.averageEggWeight === undefined
          ? undefined
          : Number(values.averageEggWeight),
      p_feed_kg: values.feedKg,
      p_feed_cost_per_kg: values.feedCostPerKg,
      p_notes: values.notes || undefined,
      p_sizes: values.sizes
        .filter((size) => size.quantity > 0)
        .map((size) => ({ egg_size_id: size.eggSizeId, quantity: size.quantity })),
    });

    if (error) return describeDatabaseError(error, "recordProductionAction");
    if (!productionId) return failure("We couldn't save that record. Please try again.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PRODUCTION_RECORDED,
      entityType: "daily_production",
      entityId: productionId,
      metadata: {
        flockId: values.flockId,
        date: values.productionDate,
        eggs: values.eggsCollected,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/production");

    return { ok: true, data: { productionId } };
  } catch (error) {
    return describeUnknownError(error, "recordProductionAction");
  }
}
