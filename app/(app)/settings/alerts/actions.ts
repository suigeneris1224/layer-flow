"use server";

import { revalidatePath } from "next/cache";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageAlertThresholds } from "@/lib/auth/permissions";
import { assertCanAccess } from "@/lib/subscriptions/entitlements";
import { saveAlertThresholds } from "@/lib/data/alert-thresholds";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { alertThresholdsSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Save a farm's alert threshold overrides.
 *
 * A genuine write path -- unlike the dashboard/analytics/reports read paths,
 * which quietly compute less when a farm is not entitled, this must refuse
 * outright, so `assertCanAccess` (which throws) is the right call here.
 */
export async function saveAlertThresholdsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageAlertThresholds(context)) {
    return failure("Your role doesn't allow changing alert settings.");
  }

  const parsed = alertThresholdsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "advanced_alerts");

    const { error } = await saveAlertThresholds(context.farmId, parsed.data);
    if (error) return describeDatabaseError(error, "saveAlertThresholdsAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.ALERT_THRESHOLDS_UPDATED,
      entityType: "alert_thresholds",
      entityId: context.farmId,
      metadata: parsed.data,
    });

    revalidatePath("/settings/alerts");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "saveAlertThresholdsAction");
  }
}
