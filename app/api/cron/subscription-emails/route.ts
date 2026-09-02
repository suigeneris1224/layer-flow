import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFarmOwnerEmail } from "@/lib/data/billing-contacts";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/data/audit";
import { sendEmail } from "@/lib/email/client";
import {
  SUBSCRIPTION_REMINDER_DAYS,
  buildPastDueReminderEmail,
  buildRenewalReminderEmail,
} from "@/lib/email/templates";
import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Daily subscription-email sweep: PAST_DUE reminders and upcoming-renewal
 * reminders, run by Vercel Cron (see vercel.json) with no user session -- the
 * "scheduled/maintenance job" case createSupabaseAdminClient()'s own doc
 * comment names as a legitimate use of the service-role client.
 *
 * Idempotent by construction: each query only picks up rows whose dedup
 * column is still null, and app/(app)/farms/actions.ts's
 * devSetSubscriptionAction clears both columns on every plan/status change --
 * a farm can be swept twice in the same window without a duplicate email.
 * One farm's failure never aborts the batch.
 */

interface FarmRow {
  farm_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  farms: { name: string; owner_id: string } | { name: string; owner_id: string }[];
}

function oneOf<T>(value: T | T[]): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const results = { pastDue: 0, renewal: 0, failed: 0 };

  const { data: pastDueRows, error: pastDueError } = await admin
    .from("subscriptions")
    .select("farm_id, plan, status, current_period_end, farms!inner(name, owner_id)")
    .eq("status", "PAST_DUE")
    .is("past_due_reminder_sent_at", null);

  if (pastDueError) {
    logger.error("cron past-due query failed", { reason: pastDueError.message });
  }

  for (const row of (pastDueRows ?? []) as unknown as FarmRow[]) {
    const farm = oneOf(row.farms);
    if (!farm) continue;

    try {
      const ownerEmail = await getFarmOwnerEmail(farm.owner_id);
      if (!ownerEmail) {
        results.failed++;
        continue;
      }

      const email = buildPastDueReminderEmail({
        farmName: farm.name,
        plan: row.plan,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
      });

      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
      });
      if (!sent.ok) {
        results.failed++;
        continue;
      }

      await admin
        .from("subscriptions")
        .update({ past_due_reminder_sent_at: new Date().toISOString() })
        .eq("farm_id", row.farm_id);

      await recordAuditLog(
        {
          farmId: row.farm_id,
          userId: null,
          action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
          entityType: "subscription",
          entityId: row.farm_id,
          metadata: { kind: "past_due_reminder", to: "owner", trigger: "cron" },
        },
        admin
      );

      results.pastDue++;
    } catch (error) {
      results.failed++;
      logger.error("cron past-due email failed", {
        farmId: row.farm_id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Farms whose current_period_end falls on the UTC calendar day exactly
  // SUBSCRIPTION_REMINDER_DAYS from now. A day-bucket match, not exact
  // timestamp equality, since the period end carries whatever time-of-day the
  // last plan change happened at and the cron itself runs at a fixed hour.
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + SUBSCRIPTION_REMINDER_DAYS);
  const dayStart = new Date(target);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(target);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const { data: renewalRows, error: renewalError } = await admin
    .from("subscriptions")
    .select("farm_id, plan, status, current_period_end, farms!inner(name, owner_id)")
    .gte("current_period_end", dayStart.toISOString())
    .lte("current_period_end", dayEnd.toISOString())
    .is("renewal_reminder_sent_at", null)
    .not("status", "in", "(CANCELED,EXPIRED)");

  if (renewalError) {
    logger.error("cron renewal query failed", { reason: renewalError.message });
  }

  for (const row of (renewalRows ?? []) as unknown as FarmRow[]) {
    const farm = oneOf(row.farms);
    if (!farm) continue;

    try {
      const ownerEmail = await getFarmOwnerEmail(farm.owner_id);
      if (!ownerEmail) {
        results.failed++;
        continue;
      }

      const email = buildRenewalReminderEmail(
        {
          farmName: farm.name,
          plan: row.plan,
          status: row.status,
          currentPeriodEnd: row.current_period_end,
        },
        SUBSCRIPTION_REMINDER_DAYS
      );

      const sent = await sendEmail({
        to: { email: ownerEmail },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
      });
      if (!sent.ok) {
        results.failed++;
        continue;
      }

      await admin
        .from("subscriptions")
        .update({ renewal_reminder_sent_at: new Date().toISOString() })
        .eq("farm_id", row.farm_id);

      await recordAuditLog(
        {
          farmId: row.farm_id,
          userId: null,
          action: AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT,
          entityType: "subscription",
          entityId: row.farm_id,
          metadata: { kind: "renewal_reminder", to: "owner", trigger: "cron" },
        },
        admin
      );

      results.renewal++;
    } catch (error) {
      results.failed++;
      logger.error("cron renewal email failed", {
        farmId: row.farm_id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("subscription emails cron finished", results);
  return Response.json(results);
}
