"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageVaccinationSchedule } from "@/lib/auth/permissions";
import { assertCanAccess } from "@/lib/subscriptions/entitlements";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { toFieldErrors, vaccinationScheduleItemSchema } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * The farm's vaccination programme. Gate order matches the rest of the app:
 * who, which farm, role, plan, then input. The programme is the farm's own;
 * nothing here suggests a vaccine or an age.
 */

function revalidateSchedule(): void {
  revalidatePath("/health");
  revalidatePath("/dashboard");
}

async function scheduleContext() {
  const user = await requireUser();
  const context = await getFarmContext();
  if (!context) return { allowed: false as const, denial: failure("Set up your farm first.") };
  if (!canManageVaccinationSchedule(context)) {
    return {
      allowed: false as const,
      denial: failure("Only the farm owner or a manager can change the vaccination programme."),
    };
  }
  return { allowed: true as const, user, context };
}

export async function createScheduleItemAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await scheduleContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = vaccinationScheduleItemSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the dose below.", toFieldErrors(parsed.error));
  }

  try {
    assertCanAccess(
      { plan: context.plan, status: context.subscriptionStatus },
      "vaccination_schedule"
    );

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vaccination_schedule_items")
      .insert({
        farm_id: context.farmId,
        vaccine_name: parsed.data.vaccineName,
        age_days: parsed.data.ageDays,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createScheduleItemAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_SCHEDULE_ITEM_CREATED,
      entityType: "vaccination_schedule_item",
      entityId: data.id,
      metadata: { vaccine: parsed.data.vaccineName, ageDays: parsed.data.ageDays },
    });

    revalidateSchedule();
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "createScheduleItemAction");
  }
}

export async function updateScheduleItemAction(
  itemId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await scheduleContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = vaccinationScheduleItemSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the dose below.", toFieldErrors(parsed.error));
  }

  try {
    assertCanAccess(
      { plan: context.plan, status: context.subscriptionStatus },
      "vaccination_schedule"
    );

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vaccination_schedule_items")
      .update({
        vaccine_name: parsed.data.vaccineName,
        age_days: parsed.data.ageDays,
        notes: parsed.data.notes || null,
      })
      .eq("id", itemId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateScheduleItemAction");
    if (!data) return failure("That dose is no longer in the programme.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_SCHEDULE_ITEM_UPDATED,
      entityType: "vaccination_schedule_item",
      entityId: itemId,
      metadata: { vaccine: parsed.data.vaccineName, ageDays: parsed.data.ageDays },
    });

    revalidateSchedule();
    return { ok: true, data: { id: itemId } };
  } catch (error) {
    return describeUnknownError(error, "updateScheduleItemAction");
  }
}

/**
 * Deleting a dose from the programme never deletes a vaccination record --
 * the FK is `on delete set null`, so a given dose just stops counting toward
 * the schedule. Allowed even after a downgrade, so a farm can tidy up.
 */
export async function deleteScheduleItemAction(itemId: string): Promise<ActionResult> {
  const gate = await scheduleContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("vaccination_schedule_items")
      .delete()
      .eq("id", itemId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteScheduleItemAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.VACCINATION_SCHEDULE_ITEM_DELETED,
      entityType: "vaccination_schedule_item",
      entityId: itemId,
    });

    revalidateSchedule();
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteScheduleItemAction");
  }
}
