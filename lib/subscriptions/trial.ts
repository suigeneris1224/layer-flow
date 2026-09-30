import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Free trials started from the paid-plan waitlist (BILLING_MODE=validation,
 * docs/billing.md). A trial is just subscriptions.status = 'TRIALING' with a
 * current_period_end -- these helpers hold the two rules around it.
 */

/**
 * True once a trial's end has passed. getFarmContext checks this on every
 * request so access ends on time, even though the daily cron is what
 * actually resets the row to Free.
 */
export function isTrialOver(
  status: SubscriptionStatus,
  currentPeriodEnd: string | null,
  now: Date = new Date()
): boolean {
  return status === "TRIALING" && currentPeriodEnd !== null && new Date(currentPeriodEnd) <= now;
}

/**
 * One trial per account, and never on top of a real plan: a trial may only
 * start from Free or from a lapsed subscription, so it can't overwrite
 * something the farmer paid for (or a PAST_DUE plan still in its grace).
 */
export function canStartTrial(
  subscription: { plan: SubscriptionPlan; status: SubscriptionStatus } | null,
  trialStartedAt: string | null
): boolean {
  if (trialStartedAt !== null) return false;
  if (!subscription) return true;
  return (
    subscription.plan === "FREE" ||
    subscription.status === "CANCELED" ||
    subscription.status === "EXPIRED"
  );
}
