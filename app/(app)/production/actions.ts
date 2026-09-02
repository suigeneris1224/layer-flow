"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canRecordProduction } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { productionExists } from "@/lib/data/production";
import type { ProductionConflict } from "@/lib/offline/db";
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

interface RecordDailyProductionResult {
  status: "ok" | "conflict";
  id: string;
  server?: {
    updatedAt: string;
    hensPresent: number;
    eggsCollected: number;
    brokenEggs: number;
    dirtyEggs: number;
    mortality: number;
    notes: string | null;
    averageEggWeight: number | null;
    sizes: { eggSizeId: string; quantity: number }[];
  };
}

/**
 * Record or correct one flock-day.
 *
 * Input is re-validated here with the same schema the browser used. Client
 * validation is a courtesy; this is the check that counts.
 *
 * `options.queuedAt` is set only when this is the offline queue
 * (lib/offline/sync.ts) replaying a write that was made while offline -- it
 * becomes the RPC's `p_client_seen_at`, letting the database detect whether
 * someone else changed this flock-day since this device last saw it. Every
 * online caller (the form, and edits from /production/[id]) omits it, which
 * disables the conflict check entirely -- exactly today's behavior.
 */
export async function recordProductionAction(
  input: unknown,
  options?: { queuedAt?: number }
): Promise<ActionResult<{ productionId: string; conflict?: ProductionConflict }>> {
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

    // Asked before the upsert, because afterwards the row always exists.
    // The RPC is a single upsert either way; this only decides which audit
    // action describes what happened.
    const wasRecorded = await productionExists(
      context.farmId,
      values.flockId,
      values.productionDate
    );

    // One transaction across daily_production, the size breakdown, feed and
    // mortality. The function runs SECURITY INVOKER, so RLS still applies and
    // farm_id is derived from the flock rather than trusted from here.
    const { data, error } = await supabase.rpc("record_daily_production", {
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
      p_client_seen_at: options?.queuedAt ? new Date(options.queuedAt).toISOString() : undefined,
    });

    if (error) return describeDatabaseError(error, "recordProductionAction");

    const result = data as unknown as RecordDailyProductionResult | null;
    if (!result?.id) return failure("We couldn't save that record. Please try again.");

    if (result.status === "conflict" && result.server) {
      const sizes: Record<string, number> = {};
      for (const size of result.server.sizes) sizes[size.eggSizeId] = size.quantity;

      // Nothing was written -- the RPC held off rather than overwrite a
      // disagreement, so there is nothing to audit-log or revalidate.
      return {
        ok: true,
        data: {
          productionId: result.id,
          conflict: {
            serverUpdatedAt: result.server.updatedAt,
            server: {
              hensPresent: result.server.hensPresent,
              eggsCollected: result.server.eggsCollected,
              brokenEggs: result.server.brokenEggs,
              dirtyEggs: result.server.dirtyEggs,
              mortality: result.server.mortality,
              notes: result.server.notes ?? "",
              averageEggWeight: result.server.averageEggWeight,
              sizes,
            },
          },
        },
      };
    }

    const productionId = result.id;

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: wasRecorded
        ? AUDIT_ACTIONS.PRODUCTION_UPDATED
        : AUDIT_ACTIONS.PRODUCTION_RECORDED,
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
    revalidatePath(`/production/${productionId}`);
    revalidatePath(`/flocks/${values.flockId}`);

    return { ok: true, data: { productionId } };
  } catch (error) {
    return describeUnknownError(error, "recordProductionAction");
  }
}
