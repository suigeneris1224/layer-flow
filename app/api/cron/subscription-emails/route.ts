import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/data/audit";
import { pruneRateLimitHits } from "@/lib/data/rate-limit";
import { sendEmail } from "@/lib/email/client";
import {
  SUBSCRIPTION_REMINDER_DAYS,
  buildPastDueReminderEmail,
  buildRenewalReminderEmail,
} from "@/lib/email/templates";
import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Daily subscription-email sweep: PAST_DUE reminders and upcoming-renewal
 * reminders, run by Vercel Cron (see vercel.json) with no user session -- the
 * "scheduled/maintenance job" case createSupabaseAdminClient()'s own doc
 * comment names as a legitimate use of the service-role client.
 *
 * Subscriptions are account-wide (one row per `owner_id`, covering every farm
 * that owner has), so this is naturally one email per account, not per farm --
 * an owner with several PAST_DUE farms would have gotten several separate
 * reminders under the old per-farm schema; there is exactly one row to sweep
 * per owner now.
 *
 * Idempotent by construction: each query only picks up rows whose dedup
 * column is still null, and app/(app)/billing/actions.ts's
 * devSetSubscriptionAction clears both columns on every plan/status change --
 * an account can be swept twice in the same window without a duplicate email.
 * One account's failure never aborts the batch.
 */

interface SubscriptionRow {
  owner_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  current_period_end: string | null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const results = { pastDue: 0, renewal: 0, failed: 0 };

  // Piggybacks on this job's existing daily schedule rather than adding a
  // second cron trigger just to keep rate_limit_hits from growing forever.
  await pruneRateLimitHits();

  // Accounts whose current_period_end falls on the UTC calendar day exactly
  // SUBSCRIPTION_REMINDER_DAYS from now. A day-bucket match, not exact
  // timestamp equality, since the period end carries whatever time-of-day the
  // last plan change happened at and the cron itself runs at a fixed hour.
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + SUBSCRIPTION_REMINDER_DAYS);
  const dayStart = new Date(target);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(target);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const [pastDueResult, renewalResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("owner_id, plan, status, billing_period, current_period_end")
      .eq("status", "PAST_DUE")
      .is("past_due_reminder_sent_at", null),
    admin
      .from("subscriptions")
      .select("owner_id, plan, status, billing_period, current_period_end")
      .gte("current_period_end", dayStart.toISOString())
      .lte("current_period_end", dayEnd.toISOString())
      .is("renewal_reminder_sent_at", null)
      .not("status", "in", "(CANCELED,EXPIRED)"),
  ]);

  if (pastDueResult.error) {
    logger.error("cron past-due query failed", { reason: pastDueResult.error.message });
  }
  if (renewalResult.error) {
    logger.error("cron renewal query failed", { reason: renewalResult.error.message });
  }

  const pastDueRows = (pastDueResult.data ?? []) as SubscriptionRow[];
  const renewalRows = (renewalResult.data ?? []) as SubscriptionRow[];

  /*
   * One listUsers() call and one bulk farms query for every owner touched by
   * either sweep, instead of a getUserById() + farms lookup per row -- same
   * batched shape as lib/data/admin.ts's getAllSubscriptions, which exists
   * for exactly this reason ("fine for one account, wasteful for every
   * account at once").
   */
  const ownerIds = [...new Set([...pastDueRows, ...renewalRows].map((row) => row.owner_id))];

  const [usersResult, farmsResult] =
    ownerIds.length > 0
      ? await Promise.all([
          admin.auth.admin.listUsers(),
          admin.from("farms").select("owner_id, name").in("owner_id", ownerIds).order("created_at", { ascending: true }),
        ])
      : [null, null];

  if (usersResult?.error) {
    logger.error("cron user list lookup failed", { reason: usersResult.error.message });
  }
  if (farmsResult?.error) {
    logger.error("cron farms lookup failed", { reason: farmsResult.error.message });
  }

  const emailByOwner = new Map(usersResult?.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const farmNamesByOwner = new Map<string, string[]>();
  for (const farm of farmsResult?.data ?? []) {
    const names = farmNamesByOwner.get(farm.owner_id) ?? [];
    names.push(farm.name);
    farmNamesByOwner.set(farm.owner_id, names);
  }

  for (const row of pastDueRows) {
    try {
      const ownerEmail = emailByOwner.get(row.owner_id);
      if (!ownerEmail) {
        results.failed++;
        continue;
      }
      const farmNames = farmNamesByOwner.get(row.owner_id) ?? [];

      const email = buildPastDueReminderEmail({
        farmNames,
        plan: row.plan,
        status: row.status,
        billingPeriod: row.billing_period,
        currentPeriodEnd: row.current_period_end,
      });

      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["past_due_reminder"],
      });
      if (!sent.ok) {
        results.failed++;
        continue;
      }

      await admin
        .from("subscriptions")
        .update({ past_due_reminder_sent_at: new Date().toISOString() })
        .eq("owner_id", row.owner_id);

      await recordAuditLog(
        {
          farmId: null,
          userId: null,
          action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
          entityType: "subscription",
          entityId: row.owner_id,
          metadata: { kind: "past_due_reminder", to: "owner", trigger: "cron" },
        },
        admin
      );

      results.pastDue++;
    } catch (error) {
      results.failed++;
      logger.error("cron past-due email failed", {
        ownerId: row.owner_id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const row of renewalRows) {
    try {
      const ownerEmail = emailByOwner.get(row.owner_id);
      if (!ownerEmail) {
        results.failed++;
        continue;
      }
      const farmNames = farmNamesByOwner.get(row.owner_id) ?? [];

      const email = buildRenewalReminderEmail(
        {
          farmNames,
          plan: row.plan,
          status: row.status,
          billingPeriod: row.billing_period,
          currentPeriodEnd: row.current_period_end,
        },
        SUBSCRIPTION_REMINDER_DAYS
      );

      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["renewal_reminder"],
      });
      if (!sent.ok) {
        results.failed++;
        continue;
      }

      await admin
        .from("subscriptions")
        .update({ renewal_reminder_sent_at: new Date().toISOString() })
        .eq("owner_id", row.owner_id);

      await recordAuditLog(
        {
          farmId: null,
          userId: null,
          action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
          entityType: "subscription",
          entityId: row.owner_id,
          metadata: { kind: "renewal_reminder", to: "owner", trigger: "cron" },
        },
        admin
      );

      results.renewal++;
    } catch (error) {
      results.failed++;
      logger.error("cron renewal email failed", {
        ownerId: row.owner_id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("subscription emails cron finished", results);
  return Response.json(results);
}
