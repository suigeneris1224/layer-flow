"use server";

import { revalidatePath } from "next/cache";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isProduction } from "@/lib/config/env";
import { getFarmDetail } from "@/lib/data/farms";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getFarmOwnerEmail } from "@/lib/data/billing-contacts";
import { sendEmail } from "@/lib/email/client";
import { buildPastDueReminderEmail, buildReceiptEmail } from "@/lib/email/templates";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { devSetSubscriptionSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Everything on the dedicated /billing page. Every action here is
 * OWNER-only (`canManageBilling`).
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

/**
 * Development-only: set the active farm's plan/status directly.
 *
 * `subscriptions` has no write policy for `authenticated` -- only a
 * service-role client (billing webhooks, normally) can write it -- so this is
 * the one place in the app that reaches for `createSupabaseAdminClient()`.
 * Gated twice: the UI that calls this never renders in production, and this
 * refuses independently too, since a hidden button is not a security boundary.
 *
 * Also simulates a billing period: every change sets current_period_start/end
 * to a fresh 30-day window (real billing has no checkout yet, so there is no
 * other source for these dates) and clears both reminder-dedup columns, since
 * a plan/status change starts a new episode worth re-notifying about if it
 * persists. See lib/email/ and app/api/cron/subscription-emails/route.ts.
 */
export async function devSetSubscriptionAction(input: unknown): Promise<ActionResult> {
  if (isProduction) return failure("Not available.");

  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) {
    return failure("Only the farm owner can change the plan.");
  }

  const parsed = devSetSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const admin = createSupabaseAdminClient();
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
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "devSetSubscriptionAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PLAN_CHANGED,
      entityType: "subscription",
      entityId: context.farmId,
      metadata: { plan: parsed.data.plan, status: parsed.data.status },
    });

    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "devSetSubscriptionAction");
  }
}
