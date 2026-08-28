"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageFlock } from "@/lib/auth/permissions";
import { assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getActiveFlockCount, getFlock } from "@/lib/data/flocks";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  createFlockSchema,
  retireFlockSchema,
  toFieldErrors,
  updateFlockSchema,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export async function createFlockAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFlock(context)) {
    return failure("Your role doesn't allow adding flocks.");
  }

  const parsed = createFlockSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const count = await getActiveFlockCount(context.farmId);
    assertCanCreate(
      { plan: context.plan, status: context.subscriptionStatus },
      "active_flocks",
      count
    );

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("flocks")
      .insert({
        farm_id: context.farmId,
        house_id: parsed.data.houseId,
        name: parsed.data.name,
        breed: parsed.data.breed,
        initial_hens: parsed.data.initialHens,
        current_hens: parsed.data.initialHens,
        placement_date: parsed.data.placementDate,
        start_laying_date: parsed.data.startLayingDate || null,
        status: parsed.data.startLayingDate ? "PRODUCING" : "GROWING",
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createFlockAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FLOCK_CREATED,
      entityType: "flock",
      entityId: data.id,
      metadata: { name: parsed.data.name, hens: parsed.data.initialHens },
    });

    revalidatePath("/flocks");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "createFlockAction");
  }
}

export async function updateFlockAction(
  flockId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFlock(context)) {
    return failure("Your role doesn't allow editing flocks.");
  }

  const parsed = updateFlockSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("flocks")
      .update({
        name: parsed.data.name,
        breed: parsed.data.breed,
        house_id: parsed.data.houseId,
        placement_date: parsed.data.placementDate,
        start_laying_date: parsed.data.startLayingDate || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", flockId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateFlockAction");
    if (!data) return failure("That flock no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FLOCK_UPDATED,
      entityType: "flock",
      entityId: flockId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/flocks");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: flockId } };
  } catch (error) {
    return describeUnknownError(error, "updateFlockAction");
  }
}

/**
 * Mark a flock SOLD or CLOSED.
 *
 * `current_hens` is never part of the update payload -- it is recalculated
 * from `mortality_records` by a database trigger, and closing a flock does
 * not change its mortality history. Retiring only ever moves a flock out of
 * the plan-limited active set (GROWING/PRODUCING), never into it, so there is
 * nothing to re-check against `assertCanCreate` here; only a future
 * "reactivate" action, moving a flock back into an active status, would need
 * that check.
 */
export async function retireFlockAction(
  flockId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFlock(context)) {
    return failure("Your role doesn't allow retiring flocks.");
  }

  const parsed = retireFlockSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const flock = await getFlock(context.farmId, flockId);
    if (!flock) return failure("That flock no longer exists.");
    if (flock.status === "SOLD" || flock.status === "CLOSED") {
      return failure("This flock is already retired.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("flocks")
      .update({ status: parsed.data.status })
      .eq("id", flockId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "retireFlockAction");

    // There is no flock_events table, so the audit log is the only durable
    // record of how many hens the flock had when it stopped.
    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FLOCK_RETIRED,
      entityType: "flock",
      entityId: flockId,
      metadata: {
        previousStatus: flock.status,
        newStatus: parsed.data.status,
        hensAtRetirement: flock.currentHens,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath("/flocks");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: flockId } };
  } catch (error) {
    return describeUnknownError(error, "retireFlockAction");
  }
}
