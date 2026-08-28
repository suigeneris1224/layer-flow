"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canAdjustInventory } from "@/lib/auth/permissions";
import { getAvailableForSize } from "@/lib/data/inventory";
import { validateAdjustment, reasonLabel } from "@/lib/domain/inventory";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { inventoryAdjustmentSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Correct the stock count for one egg size.
 *
 * Order matters here: authenticate, authorise, validate the shape, then check
 * the rule against a **freshly read** balance. The number on the farmer's
 * screen may be minutes old, so it is never what the guard trusts.
 */
export async function recordAdjustmentAction(
  input: unknown
): Promise<ActionResult<{ adjustmentId: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canAdjustInventory(context)) {
    return failure("Your role doesn't allow changing stock counts.");
  }

  const parsed = inventoryAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const signedQuantity =
    values.direction === "REMOVE" ? -values.quantity : values.quantity;

  try {
    // Reading through the caller's client means RLS confirms the size belongs
    // to their farm; a guessed id simply returns nothing.
    const balance = await getAvailableForSize(context.farmId, values.eggSizeId);
    if (!balance) {
      return failure("That egg size is no longer available. Refresh and try again.");
    }

    const check = validateAdjustment(balance.available, signedQuantity, balance.sizeName);
    if (!check.ok) {
      return failure(check.message, { quantity: check.message });
    }

    // The note is appended to the reason label so the stored text reads as a
    // sentence in the history list, while the code stays parseable.
    const reasonText = values.note
      ? `${values.reason}: ${values.note}`
      : values.reason;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("egg_inventory_adjustments")
      .insert({
        farm_id: context.farmId,
        egg_size_id: values.eggSizeId,
        adjustment_date: values.adjustmentDate,
        quantity_eggs: signedQuantity,
        reason: reasonText,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordAdjustmentAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.INVENTORY_ADJUSTED,
      entityType: "egg_inventory_adjustment",
      entityId: data.id,
      metadata: {
        eggSizeId: values.eggSizeId,
        sizeName: balance.sizeName,
        quantityEggs: signedQuantity,
        reason: reasonLabel(values.reason),
        availableBefore: balance.available,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { ok: true, data: { adjustmentId: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordAdjustmentAction");
  }
}
