"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import {
  canRecordFeed,
  canRecordMortality,
  canRecordVaccination,
} from "@/lib/auth/permissions";
import { feedCost } from "@/lib/domain/calculations";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  feedUsageSchema,
  mortalityRecordSchema,
  toFieldErrors,
  vaccinationSchema,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Standalone mortality, feed and vaccination entry.
 *
 * The rule that governs this whole file: `record_daily_production` owns every
 * mortality and feed row whose `daily_production_id` is set, and rewrites them
 * from scratch each time a day is saved. So every write here sets that column
 * to null on insert, and every update and delete carries
 * `.is("daily_production_id", null)` so a farmer can never reach through this
 * screen and edit a row the RPC is about to overwrite anyway.
 *
 * Nothing here touches `flocks.current_hens`. The mortality_recalc_hens trigger
 * derives it from the ledger; writing it by hand would fight the trigger and
 * lose.
 */

function revalidateHealth(flockId: string): void {
  revalidatePath("/health");
  revalidatePath("/dashboard");
  revalidatePath(`/flocks/${flockId}`);
}

// ---------------------------------------------------------------------------
// Mortality
// ---------------------------------------------------------------------------

export async function recordMortalityAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordMortality(context)) {
    return failure("Your role doesn't allow recording mortality.");
  }

  const parsed = mortalityRecordSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("mortality_records")
      .insert({
        farm_id: context.farmId,
        flock_id: parsed.data.flockId,
        daily_production_id: null,
        record_date: parsed.data.recordDate,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason || null,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordMortalityAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MORTALITY_RECORDED,
      entityType: "mortality_record",
      entityId: data.id,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.recordDate,
        quantity: parsed.data.quantity,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordMortalityAction");
  }
}

export async function updateMortalityAction(
  recordId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordMortality(context)) {
    return failure("Your role doesn't allow editing mortality records.");
  }

  const parsed = mortalityRecordSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("mortality_records")
      .update({
        flock_id: parsed.data.flockId,
        record_date: parsed.data.recordDate,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .is("daily_production_id", null)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateMortalityAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MORTALITY_UPDATED,
      entityType: "mortality_record",
      entityId: recordId,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.recordDate,
        quantity: parsed.data.quantity,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: recordId } };
  } catch (error) {
    return describeUnknownError(error, "updateMortalityAction");
  }
}

export async function deleteMortalityAction(recordId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordMortality(context)) {
    return failure("Your role doesn't allow deleting mortality records.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("mortality_records")
      .delete()
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .is("daily_production_id", null)
      .select("flock_id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "deleteMortalityAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MORTALITY_DELETED,
      entityType: "mortality_record",
      entityId: recordId,
      metadata: { flockId: data.flock_id },
    });

    revalidateHealth(data.flock_id);

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteMortalityAction");
  }
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export async function recordFeedUsageAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordFeed(context)) {
    return failure("Your role doesn't allow recording feed.");
  }

  const parsed = feedUsageSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("feed_usage")
      .insert({
        farm_id: context.farmId,
        flock_id: parsed.data.flockId,
        daily_production_id: null,
        usage_date: parsed.data.usageDate,
        quantity_kg: parsed.data.quantityKg,
        cost_per_kg: parsed.data.costPerKg,
        // Stored, not derived on read -- matching record_daily_production, so a
        // later correction to the unit cost never restates what was spent.
        total_cost: feedCost(parsed.data.quantityKg, parsed.data.costPerKg),
        feed_type: parsed.data.feedType || null,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordFeedUsageAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_RECORDED,
      entityType: "feed_usage",
      entityId: data.id,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.usageDate,
        quantityKg: parsed.data.quantityKg,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordFeedUsageAction");
  }
}

export async function updateFeedUsageAction(
  recordId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordFeed(context)) {
    return failure("Your role doesn't allow editing feed records.");
  }

  const parsed = feedUsageSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("feed_usage")
      .update({
        flock_id: parsed.data.flockId,
        usage_date: parsed.data.usageDate,
        quantity_kg: parsed.data.quantityKg,
        cost_per_kg: parsed.data.costPerKg,
        total_cost: feedCost(parsed.data.quantityKg, parsed.data.costPerKg),
        feed_type: parsed.data.feedType || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .is("daily_production_id", null)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateFeedUsageAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_UPDATED,
      entityType: "feed_usage",
      entityId: recordId,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.usageDate,
        quantityKg: parsed.data.quantityKg,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: recordId } };
  } catch (error) {
    return describeUnknownError(error, "updateFeedUsageAction");
  }
}

export async function deleteFeedUsageAction(recordId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordFeed(context)) {
    return failure("Your role doesn't allow deleting feed records.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("feed_usage")
      .delete()
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .is("daily_production_id", null)
      .select("flock_id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "deleteFeedUsageAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_DELETED,
      entityType: "feed_usage",
      entityId: recordId,
      metadata: { flockId: data.flock_id },
    });

    revalidateHealth(data.flock_id);

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteFeedUsageAction");
  }
}

// ---------------------------------------------------------------------------
// Vaccinations
// ---------------------------------------------------------------------------

export async function recordVaccinationAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordVaccination(context)) {
    return failure("Your role doesn't allow recording vaccinations.");
  }

  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vaccinations")
      .insert({
        farm_id: context.farmId,
        flock_id: parsed.data.flockId,
        vaccination_date: parsed.data.vaccinationDate,
        vaccine_name: parsed.data.vaccineName,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordVaccinationAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_RECORDED,
      entityType: "vaccination",
      entityId: data.id,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.vaccinationDate,
        vaccine: parsed.data.vaccineName,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordVaccinationAction");
  }
}

export async function updateVaccinationAction(
  recordId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordVaccination(context)) {
    return failure("Your role doesn't allow editing vaccinations.");
  }

  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vaccinations")
      .update({
        flock_id: parsed.data.flockId,
        vaccination_date: parsed.data.vaccinationDate,
        vaccine_name: parsed.data.vaccineName,
        notes: parsed.data.notes || null,
      })
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateVaccinationAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_UPDATED,
      entityType: "vaccination",
      entityId: recordId,
      metadata: {
        flockId: parsed.data.flockId,
        date: parsed.data.vaccinationDate,
        vaccine: parsed.data.vaccineName,
      },
    });

    revalidateHealth(parsed.data.flockId);

    return { ok: true, data: { id: recordId } };
  } catch (error) {
    return describeUnknownError(error, "updateVaccinationAction");
  }
}

export async function deleteVaccinationAction(recordId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canRecordVaccination(context)) {
    return failure("Your role doesn't allow deleting vaccinations.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vaccinations")
      .delete()
      .eq("id", recordId)
      .eq("farm_id", context.farmId)
      .select("flock_id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "deleteVaccinationAction");
    if (!data) return failure("That record no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_DELETED,
      entityType: "vaccination",
      entityId: recordId,
      metadata: { flockId: data.flock_id },
    });

    revalidateHealth(data.flock_id);

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteVaccinationAction");
  }
}
