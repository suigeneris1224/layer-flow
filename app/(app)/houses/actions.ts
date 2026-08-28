"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageHouse } from "@/lib/auth/permissions";
import { assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getHouseCount, houseHasFlocks } from "@/lib/data/houses";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { createHouseSchema, toFieldErrors, updateHouseSchema } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export async function createHouseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageHouse(context)) {
    return failure("Your role doesn't allow adding houses.");
  }

  const parsed = createHouseSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const count = await getHouseCount(context.farmId);
    assertCanCreate({ plan: context.plan, status: context.subscriptionStatus }, "houses", count);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("houses")
      .insert({
        farm_id: context.farmId,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createHouseAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.HOUSE_CREATED,
      entityType: "house",
      entityId: data.id,
      metadata: { name: parsed.data.name, capacity: parsed.data.capacity },
    });

    revalidatePath("/houses");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "createHouseAction");
  }
}

export async function updateHouseAction(
  houseId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageHouse(context)) {
    return failure("Your role doesn't allow editing houses.");
  }

  const parsed = updateHouseSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("houses")
      .update({
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes || null,
      })
      .eq("id", houseId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateHouseAction");
    if (!data) return failure("That house no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.HOUSE_UPDATED,
      entityType: "house",
      entityId: houseId,
      metadata: { name: parsed.data.name, capacity: parsed.data.capacity },
    });

    revalidatePath("/houses");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: houseId } };
  } catch (error) {
    return describeUnknownError(error, "updateHouseAction");
  }
}

export async function deleteHouseAction(houseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageHouse(context)) {
    return failure("Your role doesn't allow deleting houses.");
  }

  try {
    // Explicit precheck for a friendly message; the FK's ON DELETE RESTRICT
    // (see CONSTRAINT_MESSAGES.flocks_house_id_fkey) is the safety net if a
    // flock is created in the gap between this check and the delete below.
    if (await houseHasFlocks(context.farmId, houseId)) {
      return failure(
        "This house has a flock recorded against it, including past ones. Houses with any flock history cannot be deleted."
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("houses")
      .delete()
      .eq("id", houseId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteHouseAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.HOUSE_DELETED,
      entityType: "house",
      entityId: houseId,
    });

    revalidatePath("/houses");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteHouseAction");
  }
}
