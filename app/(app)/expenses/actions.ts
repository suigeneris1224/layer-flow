"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageExpenses } from "@/lib/auth/permissions";
import { assertCanAccess } from "@/lib/subscriptions/entitlements";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { getFlock } from "@/lib/data/flocks";
import { createExpenseSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export async function recordExpenseAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageExpenses(context)) {
    return failure("Your role doesn't allow recording expenses.");
  }

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the expense below.", toFieldErrors(parsed.error));
  }

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "full_expenses");

    const values = parsed.data;

    // `flockId` is client-supplied. RLS only checks this row's own farm_id,
    // never a referenced row's -- the same gap record_egg_sale's RPC closes
    // explicitly for its own flock_id/customer_id arguments. There is no RPC
    // here, so the check has to happen before the insert instead.
    if (values.flockId && !(await getFlock(context.farmId, values.flockId))) {
      return failure("Unknown flock for this farm.", { flockId: "Unknown flock for this farm" });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        farm_id: context.farmId,
        flock_id: values.flockId || null,
        category: values.category,
        description: values.description,
        amount: values.amount,
        expense_date: values.expenseDate,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordExpenseAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.EXPENSE_RECORDED,
      entityType: "expense",
      entityId: data.id,
      metadata: { category: values.category, amount: values.amount },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordExpenseAction");
  }
}
