"use server";

import { revalidatePath } from "next/cache";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFarmNamesForOwner } from "@/lib/data/farms";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getFarmOwnerEmail } from "@/lib/data/billing-contacts";
import { BILLING_PERIOD_DAYS } from "@/lib/subscriptions/plans";
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
 * Everything on the dedicated Settings > Subscription page. Every action here
 * is OWNER-only (`canManageBilling`).
 */

export async function emailReceiptAction(): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) return failure("Only the account owner can request a receipt.");
  if (context.plan === "FREE") {
    return failure("Receipts are available on Starter and Pro plans.");
  }

  try {
    const [{ currentPeriodEnd, billingPeriod }, farmNames] = await Promise.all([
      getSubscriptionPeriod(context.ownerId),
      getFarmNamesForOwner(context.ownerId),
    ]);
    const email = buildReceiptEmail({
      farmNames,
      plan: context.plan,
      status: context.subscriptionStatus,
      billingPeriod,
      currentPeriodEnd,
    });

    const result = await sendEmail({
      to: { email: user.email, name: user.fullName || undefined },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["receipt"],
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
  if (!canManageBilling(context)) return failure("Only the account owner can send this.");
  if (context.subscriptionStatus !== "PAST_DUE") return failure("This account is not past due.");

  try {
    const [{ currentPeriodEnd, billingPeriod }, farmNames, ownerEmail] = await Promise.all([
      getSubscriptionPeriod(context.ownerId),
      getFarmNamesForOwner(context.ownerId),
      getFarmOwnerEmail(context.ownerId),
    ]);
    if (!ownerEmail) return failure("We couldn't find an owner email for this account.");

    const email = buildPastDueReminderEmail({
      farmNames,
      plan: context.plan,
      status: context.subscriptionStatus,
      billingPeriod,
      currentPeriodEnd,
    });

    const result = await sendEmail({
      to: { email: ownerEmail },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["past_due_reminder"],
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
 * Platform-admin shortcut: set the *current* account's plan/status directly,
 * without real billing -- so an admin can change their own test account's
 * plan from Settings instead of leaving for /admin/subscriptions.
 *
 * Platform-admin only (isPlatformAdmin, not farm OWNER), gated twice (hidden
 * UI + this check), since it bypasses billing entirely. Uses
 * createSupabaseAdminClient() because `subscriptions` has no write policy for
 * `authenticated`. Also simulates a fresh 30-day billing period and clears
 * the reminder-dedup columns, same as a real billing event would.
 */
export async function devSetSubscriptionAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) {
    return failure("Only a platform admin can change the plan this way.");
  }

  const context = await getFarmContext();
  if (!context) return failure("Set up your farm first.");

  const parsed = devSetSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS[parsed.data.billingPeriod]);

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("subscriptions")
      .update({
        plan: parsed.data.plan,
        status: parsed.data.status,
        billing_period: parsed.data.billingPeriod,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        past_due_reminder_sent_at: null,
        renewal_reminder_sent_at: null,
      })
      .eq("owner_id", context.ownerId);

    if (error) return describeDatabaseError(error, "devSetSubscriptionAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PLAN_CHANGED,
      entityType: "subscription",
      entityId: context.farmId,
      metadata: {
        plan: parsed.data.plan,
        status: parsed.data.status,
        billingPeriod: parsed.data.billingPeriod,
      },
    });

    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "devSetSubscriptionAction");
  }
}
