"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BETA_SETTINGS_TAG } from "@/lib/subscriptions/beta";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { BILLING_PERIOD_DAYS } from "@/lib/subscriptions/plans";
import {
  accountDeletionRejectSchema,
  addBetaTesterSchema,
  devSetSubscriptionSchema,
  manualPaymentRejectSchema,
  setBetaMaxTestersSchema,
  supportReplySchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";
import { sendEmail } from "@/lib/email/client";
import {
  buildAccountDeletionCompletedEmail,
  buildAccountDeletionRejectedEmail,
  buildManualPaymentApprovedEmail,
  buildManualPaymentRejectedEmail,
  buildSupportReplyEmail,
} from "@/lib/email/templates";
import { logger } from "@/lib/observability/logger";

/**
 * The production-safe equivalent of app/(app)/billing/actions.ts's
 * devSetSubscriptionAction, for an account the caller does NOT belong to.
 *
 * That action is gated `!isProduction` + owner-only, since it exists so a
 * developer can flip their own test account's plan locally. This one is the
 * opposite shape on purpose: it must work in production (that is the entire
 * point -- fixing a real account's stuck subscription), gated by
 * `isPlatformAdmin` instead of farm membership. Deliberately does NOT call
 * `requirePlatformAdmin()` (lib/auth/admin.ts) -- that redirects, which is
 * right for a page and wrong for an action a client component expects a
 * `{ok:false}` result from.
 *
 * Subscriptions are account-wide: this changes every farm the account owns
 * at once, keyed by `owner_id`, not `farm_id`.
 */
export async function adminSetSubscriptionAction(
  ownerId: string,
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
    // conceptually "as if this account just went through a plan/status
    // change," so it resets the period and clears both reminder-dedup
    // columns the same way that action does.
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS[parsed.data.billingPeriod]);

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
      .eq("owner_id", ownerId);

    if (error) return describeDatabaseError(error, "adminSetSubscriptionAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.PLAN_CHANGED,
        entityType: "subscription",
        entityId: ownerId,
        metadata: {
          plan: parsed.data.plan,
          status: parsed.data.status,
          billingPeriod: parsed.data.billingPeriod,
          trigger: "admin_override",
        },
      },
      admin
    );

    revalidatePath("/admin/subscriptions");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminSetSubscriptionAction");
  }
}

/** Flip the beta-testing toggle -- see lib/subscriptions/beta.ts for what it gates. */
export async function setBetaModeAction(enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  try {
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("beta_settings").update({ enabled }).eq("id", true);
    if (error) return describeDatabaseError(error, "setBetaModeAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.BETA_MODE_TOGGLED,
        entityType: "beta_settings",
        metadata: { enabled },
      },
      admin
    );

    revalidateTag(BETA_SETTINGS_TAG);
    revalidatePath("/admin/beta-settings");
    revalidatePath("/admin", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "setBetaModeAction");
  }
}

/** Save a new beta-tester cap -- app/admin/beta-settings/'s max-limit input. */
export async function setBetaMaxTestersAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = setBetaMaxTestersSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("beta_settings")
      .update({ max_testers: parsed.data.maxTesters })
      .eq("id", true);
    if (error) return describeDatabaseError(error, "setBetaMaxTestersAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.BETA_MAX_TESTERS_CHANGED,
        entityType: "beta_settings",
        metadata: { maxTesters: parsed.data.maxTesters },
      },
      admin
    );

    revalidateTag(BETA_SETTINGS_TAG);
    revalidatePath("/admin/beta-settings");
    revalidatePath("/admin", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "setBetaMaxTestersAction");
  }
}

/** Add a beta tester by email, capped at beta_settings.max_testers. */
export async function addBetaTesterAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = addBetaTesterSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    const [{ count }, settingsResult] = await Promise.all([
      admin.from("beta_testers").select("email", { count: "exact", head: true }),
      admin.from("beta_settings").select("max_testers").eq("id", true).maybeSingle(),
    ]);
    const maxTesters = settingsResult.data?.max_testers ?? 5;

    if ((count ?? 0) >= maxTesters) {
      return failure(`You can have at most ${maxTesters} beta testers. Remove one first.`);
    }

    const { error } = await admin
      .from("beta_testers")
      .insert({ email: parsed.data.email, added_by: user.id });

    if (error) return describeDatabaseError(error, "addBetaTesterAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.BETA_TESTER_ADDED,
        entityType: "beta_testers",
        metadata: { email: parsed.data.email },
      },
      admin
    );

    revalidateTag(BETA_SETTINGS_TAG);
    revalidatePath("/admin/beta-settings");
    revalidatePath("/admin", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "addBetaTesterAction");
  }
}

/** Mark a support request resolved. */
export async function resolveSupportRequestAction(requestId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  try {
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("support_requests")
      .update({ status: "resolved" })
      .eq("id", requestId);

    if (error) return describeDatabaseError(error, "resolveSupportRequestAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.SUPPORT_REQUEST_RESOLVED,
        entityType: "support_request",
        entityId: requestId,
      },
      admin
    );

    revalidatePath("/admin/tickets");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "resolveSupportRequestAction");
  }
}

/** Reply to a farmer's support request. Best-effort emails them the reply. */
export async function replySupportRequestAction(
  requestId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = supportReplySchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: request, error: requestError } = await admin
      .from("support_requests")
      .select("id, subject, submitted_by, farms(name)")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) return describeDatabaseError(requestError, "replySupportRequestAction");
    if (!request) return failure("That request no longer exists.");

    const { error } = await admin.from("support_request_messages").insert({
      request_id: requestId,
      sender_id: user.id,
      sender_role: "admin",
      body: parsed.data.body,
    });

    if (error) return describeDatabaseError(error, "replySupportRequestAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.SUPPORT_REQUEST_REPLIED,
        entityType: "support_request",
        entityId: requestId,
      },
      admin
    );

    const { data: farmer } = await admin.auth.admin.getUserById(request.submitted_by);
    const farmerEmail = farmer?.user?.email;
    if (farmerEmail) {
      const farmName = (
        Array.isArray(request.farms) ? request.farms[0] : request.farms
      )?.name;
      const email = buildSupportReplyEmail({
        farmName: farmName ?? "your farm",
        subject: request.subject,
        body: parsed.data.body,
      });
      const sent = await sendEmail({
        to: { email: farmerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["support_reply"],
      });
      if (!sent.ok) {
        logger.warn("support reply email failed", { reason: sent.error });
      }
    }

    revalidatePath("/admin/tickets");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "replySupportRequestAction");
  }
}

/**
 * Approve a pending manual QR/bank transfer payment.
 *
 * Grants the plan/period the farmer submitted for, using the exact same
 * subscriptions-table update shape as adminSetSubscriptionAction above (fresh
 * period dates, both reminder-dedup columns cleared). The approval email is
 * best-effort, same as replySupportRequestAction below -- a failed send must
 * never leave the payment stuck un-reviewed.
 */
export async function adminApproveManualPaymentAction(paymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  try {
    const admin = createSupabaseAdminClient();

    const { data: payment, error: fetchError } = await admin
      .from("manual_payments")
      .select("id, owner_id, plan, billing_period, status, reference_number, amount_centavos")
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchError) return describeDatabaseError(fetchError, "adminApproveManualPaymentAction");
    if (!payment) return failure("That payment no longer exists.");
    if (payment.status !== "PENDING") return failure("That payment was already reviewed.");

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS[payment.billing_period]);

    // Claim the row atomically -- the WHERE status='PENDING' guard, plus
    // checking a row actually came back, is what closes the race two admins
    // approving the same payment at once would otherwise hit: the earlier
    // SELECT above can't stop both from proceeding, but only one UPDATE can
    // ever match this WHERE clause. Claiming first, before touching
    // subscriptions, means a losing second request bails here instead of
    // granting the plan twice.
    const { data: claimed, error: updateError } = await admin
      .from("manual_payments")
      .update({ status: "APPROVED", reviewed_by: user.id, reviewed_at: now.toISOString() })
      .eq("id", paymentId)
      .eq("status", "PENDING")
      .select("id");

    if (updateError) return describeDatabaseError(updateError, "adminApproveManualPaymentAction");
    if (!claimed || claimed.length === 0) return failure("That payment was already reviewed.");

    const { error: subError } = await admin
      .from("subscriptions")
      .update({
        plan: payment.plan,
        status: "ACTIVE",
        billing_period: payment.billing_period,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        past_due_reminder_sent_at: null,
        renewal_reminder_sent_at: null,
      })
      .eq("owner_id", payment.owner_id);

    if (subError) return describeDatabaseError(subError, "adminApproveManualPaymentAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.MANUAL_PAYMENT_APPROVED,
        entityType: "manual_payment",
        entityId: paymentId,
        metadata: { plan: payment.plan, billingPeriod: payment.billing_period },
      },
      admin
    );
    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.PLAN_CHANGED,
        entityType: "subscription",
        entityId: payment.owner_id,
        metadata: { trigger: "manual_payment_approved" },
      },
      admin
    );

    const { data: owner } = await admin.auth.admin.getUserById(payment.owner_id);
    const ownerEmail = owner?.user?.email;
    if (ownerEmail) {
      const email = buildManualPaymentApprovedEmail({
        plan: payment.plan,
        billingPeriod: payment.billing_period,
        amountCentavos: payment.amount_centavos,
        transactionId: payment.reference_number,
        paidAt: now.toISOString(),
      });
      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["manual_payment_approved"],
      });
      if (!sent.ok) {
        logger.warn("manual payment approval email failed", { reason: sent.error });
      }
    }

    revalidatePath("/admin/subscriptions");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminApproveManualPaymentAction");
  }
}

/** Reject a pending manual QR/bank transfer payment. Leaves `subscriptions` untouched. */
export async function adminRejectManualPaymentAction(
  paymentId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = manualPaymentRejectSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: payment, error: fetchError } = await admin
      .from("manual_payments")
      .select("id, owner_id, plan, billing_period, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchError) return describeDatabaseError(fetchError, "adminRejectManualPaymentAction");
    if (!payment) return failure("That payment no longer exists.");
    if (payment.status !== "PENDING") return failure("That payment was already reviewed.");

    const now = new Date();
    const { data: claimed, error: updateError } = await admin
      .from("manual_payments")
      .update({
        status: "REJECTED",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        rejection_reason: parsed.data.reason || null,
      })
      .eq("id", paymentId)
      .eq("status", "PENDING")
      .select("id");

    if (updateError) return describeDatabaseError(updateError, "adminRejectManualPaymentAction");
    if (!claimed || claimed.length === 0) return failure("That payment was already reviewed.");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.MANUAL_PAYMENT_REJECTED,
        entityType: "manual_payment",
        entityId: paymentId,
        metadata: { reason: parsed.data.reason || null },
      },
      admin
    );

    const { data: owner } = await admin.auth.admin.getUserById(payment.owner_id);
    const ownerEmail = owner?.user?.email;
    if (ownerEmail) {
      const email = buildManualPaymentRejectedEmail({
        plan: payment.plan,
        billingPeriod: payment.billing_period,
        reason: parsed.data.reason || undefined,
      });
      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["manual_payment_rejected"],
      });
      if (!sent.ok) {
        logger.warn("manual payment rejection email failed", { reason: sent.error });
      }
    }

    revalidatePath("/admin/subscriptions");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminRejectManualPaymentAction");
  }
}

/** Remove a beta tester by email. */
export async function removeBetaTesterAction(email: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  try {
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("beta_testers").delete().eq("email", email);
    if (error) return describeDatabaseError(error, "removeBetaTesterAction");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.BETA_TESTER_REMOVED,
        entityType: "beta_testers",
        metadata: { email },
      },
      admin
    );

    revalidateTag(BETA_SETTINGS_TAG);
    revalidatePath("/admin/beta-settings");
    revalidatePath("/admin", "layout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "removeBetaTesterAction");
  }
}

/** Remove every object under `<bucket>/<prefix>/` -- storage has no cascade
 *  relationship with Postgres rows, so a farm/account deletion has to clear
 *  it out explicitly or the files become permanently orphaned. */
async function removeStorageFolder(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  prefix: string
): Promise<void> {
  const { data: files } = await admin.storage.from(bucket).list(prefix);
  if (!files || files.length === 0) return;
  await admin.storage.from(bucket).remove(files.map((file) => `${prefix}/${file.name}`));
}

/**
 * Approve a pending account deletion request: the actual, irreversible work.
 *
 * Order matters. `farms.owner_id` is `on delete restrict`
 * (supabase/migrations/20250101000000_core.sql), so every farm the requester
 * owns must be gone before `auth.admin.deleteUser` can succeed. Deleting a
 * farm row cascades everything farm-scoped in one statement -- houses,
 * flocks, production, sales, expenses, egg sizes/inventory, customers,
 * notifications, alert thresholds, farm members/invitations, support
 * requests, subscriptions -- confirmed safe against the RESTRICT edges inside
 * that subgraph (they're all between two tables that both cascade from the
 * same farm). Storage is untouched by any of this and must be cleared
 * explicitly, both here and for the user's own avatar/cover/receipts.
 */
export async function adminApproveAccountDeletionAction(requestId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  try {
    const admin = createSupabaseAdminClient();

    const { data: request, error: fetchError } = await admin
      .from("account_deletion_requests")
      .select("id, owner_id, email, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) return describeDatabaseError(fetchError, "adminApproveAccountDeletionAction");
    if (!request) return failure("That request no longer exists.");
    if (request.status !== "PENDING") return failure("That request was already reviewed.");
    if (!request.owner_id) return failure("This account no longer exists -- nothing left to delete.");

    const ownerId = request.owner_id;

    const { data: farms, error: farmsError } = await admin
      .from("farms")
      .select("id")
      .eq("owner_id", ownerId);

    if (farmsError) return describeDatabaseError(farmsError, "adminApproveAccountDeletionAction");

    for (const farm of farms ?? []) {
      await removeStorageFolder(admin, "farm-photos", farm.id);
      const { error: farmDeleteError } = await admin.from("farms").delete().eq("id", farm.id);
      if (farmDeleteError) {
        return describeDatabaseError(farmDeleteError, "adminApproveAccountDeletionAction");
      }
    }

    await removeStorageFolder(admin, "avatars", ownerId);
    await removeStorageFolder(admin, "covers", ownerId);
    await removeStorageFolder(admin, "manual-payment-receipts", ownerId);

    logger.warn("account deleted", {
      ownerId,
      email: request.email,
      farmCount: (farms ?? []).length,
    });

    // Best-effort, and deliberately before deleteUser -- this is the last
    // moment an email can reach this address through the app.
    const completedEmail = buildAccountDeletionCompletedEmail();
    const sent = await sendEmail({
      to: { email: request.email },
      subject: completedEmail.subject,
      htmlContent: completedEmail.html,
      textContent: completedEmail.text,
      tags: ["account_deletion_completed"],
    });
    if (!sent.ok) {
      logger.warn("account deletion completed email failed", { reason: sent.error });
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(ownerId);
    if (deleteUserError) {
      logger.error("auth user deletion failed after farm cleanup", {
        ownerId,
        reason: deleteUserError.message,
      });
      return failure(
        "Farm data was removed, but the account itself couldn't be deleted. Check the server logs."
      );
    }

    // owner_id is already null by now (on delete set null cascaded it) --
    // this row is the surviving audit trail that the request existed and was
    // handled, matched by id, not owner_id.
    const { error: updateError } = await admin
      .from("account_deletion_requests")
      .update({ status: "COMPLETED", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateError) {
      logger.warn("account deletion request status update failed", {
        reason: updateError.message,
      });
    }

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.ACCOUNT_DELETION_APPROVED,
        entityType: "account_deletion_request",
        entityId: requestId,
        metadata: { deletedEmail: request.email, farmCount: (farms ?? []).length },
      },
      admin
    );

    revalidatePath("/admin/subscriptions");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminApproveAccountDeletionAction");
  }
}

/** Reject a pending account deletion request. Touches no data. */
export async function adminRejectAccountDeletionAction(
  requestId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) return failure("Not authorized.");

  const parsed = accountDeletionRejectSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: request, error: fetchError } = await admin
      .from("account_deletion_requests")
      .select("id, email, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) return describeDatabaseError(fetchError, "adminRejectAccountDeletionAction");
    if (!request) return failure("That request no longer exists.");
    if (request.status !== "PENDING") return failure("That request was already reviewed.");

    const now = new Date();
    const { data: claimed, error: updateError } = await admin
      .from("account_deletion_requests")
      .update({
        status: "REJECTED",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        rejection_reason: parsed.data.reason || null,
      })
      .eq("id", requestId)
      .eq("status", "PENDING")
      .select("id");

    if (updateError) return describeDatabaseError(updateError, "adminRejectAccountDeletionAction");
    if (!claimed || claimed.length === 0) return failure("That request was already reviewed.");

    await recordAuditLog(
      {
        farmId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.ACCOUNT_DELETION_REJECTED,
        entityType: "account_deletion_request",
        entityId: requestId,
        metadata: { reason: parsed.data.reason || null },
      },
      admin
    );

    const email = buildAccountDeletionRejectedEmail({ reason: parsed.data.reason || undefined });
    const sent = await sendEmail({
      to: { email: request.email },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["account_deletion_rejected"],
    });
    if (!sent.ok) {
      logger.warn("account deletion rejection email failed", { reason: sent.error });
    }

    revalidatePath("/admin/subscriptions");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "adminRejectAccountDeletionAction");
  }
}
