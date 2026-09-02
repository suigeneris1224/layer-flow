"use server";

import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { getFarmDetail } from "@/lib/data/farms";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getFarmOwnerEmail } from "@/lib/data/billing-contacts";
import { sendEmail } from "@/lib/email/client";
import { buildPastDueReminderEmail, buildReceiptEmail } from "@/lib/email/templates";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { describeUnknownError, failure, type ActionResult } from "@/lib/errors";

/**
 * Manual subscription emails, both OWNER-only (`canManageBilling`).
 *
 * Deliberately separate from actions.ts: this is a distinct feature surface
 * (email, not farm/plan CRUD) with its own imports. Neither action touches
 * the reminder-dedup columns on `subscriptions` -- those exist only to stop
 * the daily cron repeating itself; a farmer clicking a button is always
 * allowed to send on demand.
 */

export async function emailReceiptAction(): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) return failure("Only the farm owner can request a receipt.");

  try {
    const { currentPeriodEnd } = await getSubscriptionPeriod(context.farmId);
    const email = buildReceiptEmail({
      farmName: context.farmName,
      plan: context.plan,
      status: context.subscriptionStatus,
      currentPeriodEnd,
    });

    const result = await sendEmail({
      to: { email: user.email, name: user.fullName || undefined },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    });
    if (!result.ok) return failure("We couldn't send that email. Please try again.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
      entityType: "subscription",
      entityId: context.farmId,
      metadata: { kind: "receipt", to: "self", trigger: "manual" },
    });

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "emailReceiptAction");
  }
}

export async function sendPastDueReminderAction(): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) return failure("Only the farm owner can send this.");
  if (context.subscriptionStatus !== "PAST_DUE") return failure("This farm is not past due.");

  try {
    const [detail, { currentPeriodEnd }] = await Promise.all([
      getFarmDetail(context.farmId),
      getSubscriptionPeriod(context.farmId),
    ]);
    if (!detail) return failure("We couldn't load this farm's details.");

    const ownerEmail = await getFarmOwnerEmail(detail.ownerId);
    if (!ownerEmail) return failure("We couldn't find an owner email for this farm.");

    const email = buildPastDueReminderEmail({
      farmName: context.farmName,
      plan: context.plan,
      status: context.subscriptionStatus,
      currentPeriodEnd,
    });

    const result = await sendEmail({
      to: { email: ownerEmail },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    });
    if (!result.ok) return failure("We couldn't send that email. Please try again.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
      entityType: "subscription",
      entityId: context.farmId,
      metadata: { kind: "past_due_reminder", to: "owner", trigger: "manual" },
    });

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "sendPastDueReminderAction");
  }
}
