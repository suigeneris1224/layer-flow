"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { devSetSubscriptionSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * The production-safe equivalent of app/(app)/billing/actions.ts's
 * devSetSubscriptionAction, for a farm the caller does NOT belong to.
 *
 * That action is gated `!isProduction` + farm-owner-only, since it exists so
 * a developer can flip their own test farm's plan locally. This one is the
 * opposite shape on purpose: it must work in production (that is the entire
 * point -- fixing a real farm's stuck subscription), gated by
 * `isPlatformAdmin` instead of farm membership. Deliberately does NOT call
 * `requirePlatformAdmin()` (lib/auth/admin.ts) -- that redirects, which is
 * right for a page and wrong for an action a client component expects a
 * `{ok:false}` result from.
 */
export async function adminSetSubscriptionAction(
  farmId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = devSetSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    // Same column set as devSetSubscriptionAction: an override is
    // conceptually "as if this farm just went through a plan/status
    // change," so it resets the period and clears both reminder-dedup
    // columns the same way that action does.
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error } = await admin
      .from("subscriptions")
      .update({
        plan: parsed.data.plan,
        status: parsed.data.status,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        past_due_reminder_sent_at: null,
        renewal_reminder_sent_at: null,
      })
      .eq("farm_id", farmId);

    if (error) return describeDatabaseError(error, "adminSetSubscriptionAction");

    await recordAuditLog(
      {
        farmId,
        userId: user.id,
        action: AUDIT_ACTIONS.PLAN_CHANGED,
        entityType: "subscription",
        entityId: farmId,
        metadata: { plan: parsed.data.plan, status: parsed.data.status, trigger: "admin_override" },
      },
      admin
    );

    revalidatePath("/admin");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminSetSubscriptionAction");
  }
}
