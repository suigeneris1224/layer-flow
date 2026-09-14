"use server";

import { revalidatePath } from "next/cache";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageAlertThresholds } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { saveNotificationPreferences } from "@/lib/data/notification-preferences";
import { notificationPreferencesSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Settings -> Notifications' two on/off switches. Same "who configures
 * alerting" role gate as /settings/alerts -- canManageAlertThresholds
 * (MANAGER+), not OWNER-only.
 */
export async function saveNotificationPreferencesAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageAlertThresholds(context)) {
    return failure("Your role doesn't allow changing notification settings.");
  }

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const { error } = await saveNotificationPreferences(context.farmId, parsed.data);

    if (error) return describeDatabaseError(error, "saveNotificationPreferencesAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.NOTIFICATION_PREFERENCES_UPDATED,
      entityType: "notification_preferences",
      entityId: context.farmId,
      metadata: parsed.data,
    });

    revalidatePath("/settings/notifications");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "saveNotificationPreferencesAction");
  }
}
