"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageCustomers } from "@/lib/auth/permissions";
import { assertCanAccess, assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getCustomerCount } from "@/lib/data/customers";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  createCustomerSchema,
  toFieldErrors,
  updateCustomerSchema,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export async function createCustomerAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageCustomers(context)) {
    return failure("Your role doesn't allow adding customers.");
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "customers");
    assertCanCreate(entitlement, "customers", await getCustomerCount(context.farmId));

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        farm_id: context.farmId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createCustomerAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.CUSTOMER_CREATED,
      entityType: "customer",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/customers");
    revalidatePath("/sales");

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "createCustomerAction");
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageCustomers(context)) {
    return failure("Your role doesn't allow editing customers.");
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", customerId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateCustomerAction");
    if (!data) return failure("That customer no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.CUSTOMER_UPDATED,
      entityType: "customer",
      entityId: customerId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/customers");
    revalidatePath("/sales");

    return { ok: true, data: { id: customerId } };
  } catch (error) {
    return describeUnknownError(error, "updateCustomerAction");
  }
}

/**
 * `egg_sales.customer_id` is `on delete set null` -- deleting a customer never
 * orphans a sale, it just becomes a walk-in one. No blocking condition needed.
 */
export async function deleteCustomerAction(customerId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageCustomers(context)) {
    return failure("Your role doesn't allow deleting customers.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteCustomerAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.CUSTOMER_DELETED,
      entityType: "customer",
      entityId: customerId,
    });

    revalidatePath("/customers");
    revalidatePath("/sales");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteCustomerAction");
  }
}
