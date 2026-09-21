import "server-only";

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature, parseWebhookEvent } from "@/lib/subscriptions/paymongo";
import { BILLING_PERIOD_DAYS } from "@/lib/subscriptions/plans";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { sendEmail } from "@/lib/email/client";
import { buildManualPaymentApprovedEmail } from "@/lib/email/templates";
import { logger } from "@/lib/observability/logger";
import type { BillingPeriod, Json, SubscriptionPlan } from "@/lib/types/database";

/**
 * PayMongo's payment webhook: no user session, so signature verification is
 * the only gate (see lib/subscriptions/paymongo.ts's verifyWebhookSignature).
 * Set this route's URL in PayMongo Dashboard -> Developers -> Webhooks with
 * only `link.payment.paid` selected -- PayMongo's event picker has no
 * link-scoped failure/expiry event.
 *
 * Reads the raw body as text, not `.json()`, because the signature is an
 * HMAC over the exact bytes PayMongo sent -- parsing first and
 * re-serializing would not reliably reproduce them.
 *
 * Never throws back a failure that would make PayMongo retry indefinitely:
 * an unknown/duplicate link id is logged and still answered 200, same
 * reasoning as app/api/webhooks/brevo/route.ts.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event;
  try {
    event = parseWebhookEvent(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (event.type === "unhandled" || !event.linkId) {
    return new Response("ok", { status: 200 });
  }

  const admin = createSupabaseAdminClient();

  // payment.paid is the only event this route ever receives (PayMongo has no
  // link.payment.failed/expired event -- see parseWebhookEvent). Claim the
  // row atomically: a duplicate delivery of the same event finds zero
  // PENDING rows to claim on the second attempt, which is exactly the
  // idempotency docs/billing.md requires.
  const now = new Date();
  const { data: claimed, error: claimError } = await admin
    .from("paymongo_payments")
    .update({
      status: "PAID",
      provider_payment_id: event.paymentId,
      paid_at: now.toISOString(),
      raw_webhook_payload: event.raw as Json,
    })
    .eq("provider_link_id", event.linkId)
    .eq("status", "PENDING")
    .select("id, owner_id, plan, billing_period")
    .maybeSingle();

  if (claimError) {
    logger.error("paymongo webhook: claim failed", { reason: claimError.message });
    return new Response("ok", { status: 200 });
  }
  if (!claimed) {
    // Already PAID (retry) or an unknown link id -- safe no-op either way.
    return new Response("ok", { status: 200 });
  }

  const plan = claimed.plan as SubscriptionPlan;
  const billingPeriod = claimed.billing_period as BillingPeriod;
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS[billingPeriod]);

  const { error: subError } = await admin
    .from("subscriptions")
    .update({
      plan,
      status: "ACTIVE",
      billing_period: billingPeriod,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      past_due_reminder_sent_at: null,
      renewal_reminder_sent_at: null,
    })
    .eq("owner_id", claimed.owner_id);

  if (subError) {
    logger.error("paymongo webhook: subscriptions update failed", { reason: subError.message });
    return new Response("ok", { status: 200 });
  }

  await recordAuditLog(
    {
      farmId: null,
      userId: null,
      action: AUDIT_ACTIONS.PAYMONGO_PAYMENT_ACTIVATED,
      entityType: "paymongo_payment",
      entityId: claimed.id,
      metadata: { plan, billingPeriod, trigger: "paymongo_webhook" },
    },
    admin
  );
  await recordAuditLog(
    {
      farmId: null,
      userId: null,
      action: AUDIT_ACTIONS.PLAN_CHANGED,
      entityType: "subscription",
      entityId: claimed.owner_id,
      metadata: { trigger: "paymongo_webhook" },
    },
    admin
  );

  const { data: owner } = await admin.auth.admin.getUserById(claimed.owner_id);
  const ownerEmail = owner?.user?.email;
  if (ownerEmail) {
    const email = buildManualPaymentApprovedEmail({ plan, billingPeriod });
    const sent = await sendEmail({
      to: { email: ownerEmail },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["paymongo_payment_activated"],
    });
    if (!sent.ok) {
      logger.warn("paymongo payment activated email failed", { reason: sent.error });
    }
  }

  return new Response("ok", { status: 200 });
}
