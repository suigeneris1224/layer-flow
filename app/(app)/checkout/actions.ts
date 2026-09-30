"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PLANS, TRIAL_DAYS, priceCentavosFor } from "@/lib/subscriptions/plans";
import { canStartTrial } from "@/lib/subscriptions/trial";
import { serverEnv } from "@/lib/config/env";
import { sendEmail } from "@/lib/email/client";
import { buildWaitlistConfirmationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/observability/logger";
import * as paymongo from "@/lib/subscriptions/paymongo";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  checkoutPlanSchema,
  manualPaymentSubmitSchema,
  toFieldErrors,
  waitlistJoinSchema,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { formatRetryMessage } from "@/lib/domain/rate-limit";
import { resolveUploadType } from "@/lib/upload/file-signature";
import { generatePaymentNote } from "@/lib/domain/manual-payment-note";

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const PAID_PLANS_CLOSED = "Paid plans aren't open yet. Join the waitlist on this page instead.";
const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * Submit a manual QR/bank transfer payment for review.
 *
 * Mirrors app/(app)/farms/actions.ts's uploadFarmPhotoAction for the upload
 * itself (FormData, MIME allow-list, size cap), but writes to the private
 * `manual-payment-receipts` bucket fenced by owner id, not farm id --
 * subscriptions (and so this) are account-wide. Leaves `subscriptions`
 * untouched: the account keeps its current plan until an admin approves this
 * row (see app/admin/actions.ts's adminApproveManualPaymentAction).
 */
export async function submitManualPaymentAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) {
    return failure("Only the account owner can submit a payment.");
  }

  // Validation mode takes no money at all (docs/billing.md) -- the checkout
  // page shows the waitlist instead, and this stops a stale tab or a direct
  // call from getting through anyway.
  if (serverEnv.billingMode === "validation") return failure(PAID_PLANS_CLOSED);

  const limit = await consumeRateLimit(context.ownerId, "manual_payment");
  if (!limit.allowed) {
    return failure(formatRetryMessage(limit.retryAfterSeconds));
  }

  const parsed = manualPaymentSubmitSchema.safeParse({
    payerName: formData.get("payerName"),
    referenceNumber: formData.get("referenceNumber"),
    plan: formData.get("plan"),
    billingPeriod: formData.get("billingPeriod"),
  });
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Attach your proof of payment.");
  }

  const extension = await resolveUploadType(file, RECEIPT_TYPES);
  if (!extension) {
    return failure("Use a JPG, PNG, or PDF file.");
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return failure("That file is larger than 5 MB. Please choose a smaller one.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const paymentId = randomUUID();
    const path = `${context.ownerId}/${paymentId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("manual-payment-receipts")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return failure("We couldn't upload that file. Please try again.");
    }

    const plan = PLANS[parsed.data.plan];
    const amountCentavos = priceCentavosFor(plan, parsed.data.billingPeriod);

    const { error } = await supabase.from("manual_payments").insert({
      id: paymentId,
      owner_id: context.ownerId,
      farm_id: context.farmId,
      plan: parsed.data.plan,
      billing_period: parsed.data.billingPeriod,
      amount_centavos: amountCentavos,
      payer_name: parsed.data.payerName,
      reference_number: parsed.data.referenceNumber,
      // Server-computed, not read from the client -- same reasoning as
      // amountCentavos above -- so a farmer can't submit an arbitrary value
      // an admin might mistake for the real reconciliation code.
      payment_note: generatePaymentNote(context.ownerId),
      receipt_storage_path: path,
      status: "PENDING",
    });

    if (error) return describeDatabaseError(error, "submitManualPaymentAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MANUAL_PAYMENT_SUBMITTED,
      entityType: "manual_payment",
      entityId: paymentId,
      metadata: { plan: parsed.data.plan, billingPeriod: parsed.data.billingPeriod },
    });

    revalidatePath("/settings/billing");
    revalidatePath("/checkout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "submitManualPaymentAction");
  }
}

/**
 * Create a PayMongo Link for one billing cycle and hand back its hosted
 * checkout URL. Mirrors submitManualPaymentAction's guard order; unlike that
 * action, nothing here touches `subscriptions` -- that only happens once
 * the webhook (app/api/webhooks/paymongo/route.ts) confirms the payment.
 *
 * Inserts through the service-role client: paymongo_payments has no client
 * insert policy (see supabase/migrations/20250101003300_paymongo_payments.sql)
 * so only server-side code populates it, same as manual_payments' review
 * actions do for status transitions.
 */
export async function createPaymongoCheckoutAction(
  input: unknown
): Promise<ActionResult<{ checkoutUrl: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) {
    return failure("Only the account owner can change the plan.");
  }

  // Validation mode takes no money at all (docs/billing.md) -- the checkout
  // page shows the waitlist instead, and this stops a stale tab or a direct
  // call from getting through anyway.
  if (serverEnv.billingMode === "validation") return failure(PAID_PLANS_CLOSED);

  const limit = await consumeRateLimit(context.ownerId, "paymongo_checkout");
  if (!limit.allowed) {
    return failure(formatRetryMessage(limit.retryAfterSeconds));
  }

  const parsed = checkoutPlanSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const plan = PLANS[parsed.data.plan];
    const amountCentavos = priceCentavosFor(plan, parsed.data.billingPeriod);

    const { checkoutUrl, providerReferenceId } = await paymongo.createCheckout({
      ownerId: context.ownerId,
      plan: parsed.data.plan,
      billingPeriod: parsed.data.billingPeriod,
      amountCentavos,
    });

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("paymongo_payments").insert({
      owner_id: context.ownerId,
      farm_id: context.farmId,
      plan: parsed.data.plan,
      billing_period: parsed.data.billingPeriod,
      amount_centavos: amountCentavos,
      provider_link_id: providerReferenceId,
      checkout_url: checkoutUrl,
      status: "PENDING",
    });

    if (error) return describeDatabaseError(error, "createPaymongoCheckoutAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PAYMONGO_CHECKOUT_CREATED,
      entityType: "paymongo_payment",
      entityId: providerReferenceId,
      metadata: { plan: parsed.data.plan, billingPeriod: parsed.data.billingPeriod },
    });

    return { ok: true, data: { checkoutUrl } };
  } catch (error) {
    return describeUnknownError(error, "createPaymongoCheckoutAction");
  }
}

/**
 * Join the paid-plan waitlist while BILLING_MODE=validation, and start a free
 * trial of the chosen plan if the account is eligible (lib/subscriptions/
 * trial.ts: one per account, only from Free or a lapsed plan).
 *
 * Both writes go through the service-role client: plan_waitlist and
 * subscriptions have no client write policy (the waitlist migration and
 * 20250101000600_grants.sql). The plan itself is only ever written to
 * `subscriptions` -- the waitlist row records interest, not access.
 */
export async function joinWaitlistAction(
  input: unknown
): Promise<ActionResult<{ trialEndsAt: string | null }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) {
    return failure("Only the account owner can join the waitlist.");
  }
  if (serverEnv.billingMode !== "validation") {
    return failure("Paid plans are open -- choose a payment method on this page.");
  }

  const limit = await consumeRateLimit(context.ownerId, "waitlist_join");
  if (!limit.allowed) {
    return failure(formatRetryMessage(limit.retryAfterSeconds));
  }

  const parsed = waitlistJoinSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();
    const [existingResult, subscriptionResult] = await Promise.all([
      admin.from("plan_waitlist").select("trial_started_at").eq("owner_id", context.ownerId).maybeSingle(),
      admin.from("subscriptions").select("plan, status").eq("owner_id", context.ownerId).maybeSingle(),
    ]);
    if (existingResult.error) return describeDatabaseError(existingResult.error, "joinWaitlistAction");
    if (subscriptionResult.error) return describeDatabaseError(subscriptionResult.error, "joinWaitlistAction");

    // Beta testers already have Pro without a subscription row saying so --
    // a trial would only overwrite the real (Free) row underneath.
    const startTrial =
      !context.isBetaOverride &&
      canStartTrial(subscriptionResult.data, existingResult.data?.trial_started_at ?? null);

    const now = new Date();
    const trialEndsAt = startTrial
      ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: waitlistError } = await admin.from("plan_waitlist").upsert(
      {
        owner_id: context.ownerId,
        farm_name: parsed.data.farmName,
        mobile_number: parsed.data.mobileNumber,
        flock_size: parsed.data.flockSize,
        plan_wanted: parsed.data.plan,
        contact_consent_at: now.toISOString(),
        // Only set on the join that starts the trial; a rejoin leaves the
        // original dates alone (they're omitted, not overwritten with null).
        ...(startTrial ? { trial_started_at: now.toISOString(), trial_ends_at: trialEndsAt } : {}),
      },
      { onConflict: "owner_id" }
    );
    if (waitlistError) return describeDatabaseError(waitlistError, "joinWaitlistAction");

    if (startTrial) {
      // Same shape as every other subscription write (paymongo webhook,
      // admin approval): period dates set, reminder dedup columns cleared.
      const { error: subscriptionError } = await admin
        .from("subscriptions")
        .update({
          plan: parsed.data.plan,
          status: "TRIALING",
          billing_period: "MONTHLY",
          current_period_start: now.toISOString(),
          current_period_end: trialEndsAt,
          past_due_reminder_sent_at: null,
          renewal_reminder_sent_at: null,
        })
        .eq("owner_id", context.ownerId);
      if (subscriptionError) return describeDatabaseError(subscriptionError, "joinWaitlistAction");
    }

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.WAITLIST_JOINED,
      entityType: "plan_waitlist",
      entityId: context.ownerId,
      metadata: { plan: parsed.data.plan, flockSize: parsed.data.flockSize, trialStarted: startTrial },
    });
    if (startTrial) {
      await recordAuditLog({
        farmId: context.farmId,
        userId: user.id,
        action: AUDIT_ACTIONS.TRIAL_STARTED,
        entityType: "subscription",
        entityId: context.ownerId,
        metadata: { plan: parsed.data.plan, trialEndsAt },
      });
    }

    const email = buildWaitlistConfirmationEmail({
      fullName: user.fullName || context.farmName,
      planName: PLANS[parsed.data.plan].name,
      trialEndsAt,
    });
    const sent = await sendEmail({
      to: { email: user.email },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["waitlist_confirmation"],
    });
    if (!sent.ok) {
      // Best-effort: the entry (and any trial) is saved either way.
      logger.warn("waitlist confirmation email failed", { reason: sent.error });
    }

    revalidatePath("/checkout");
    revalidatePath("/settings/billing");
    revalidatePath("/dashboard");

    return { ok: true, data: { trialEndsAt } };
  } catch (error) {
    return describeUnknownError(error, "joinWaitlistAction");
  }
}
