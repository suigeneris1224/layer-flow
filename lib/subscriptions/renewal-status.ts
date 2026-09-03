import { SUBSCRIPTION_REMINDER_DAYS } from "@/lib/email/templates";
import { PLANS } from "@/lib/subscriptions/plans";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * What to tell the owner about their own renewal, if anything -- the in-app
 * mirror of the cron's past-due/renewal-reminder emails (lib/email/templates.ts
 * and app/api/cron/subscription-emails/route.ts), for an owner who might not
 * check email as often as they open the app. Same SUBSCRIPTION_REMINDER_DAYS
 * threshold as the email, so the two never disagree about when "soon" starts.
 */
export interface RenewalBanner {
  tone: "warn" | "bad";
  message: string;
}

export function renewalBanner(
  subject: { plan: SubscriptionPlan; status: SubscriptionStatus },
  currentPeriodEnd: string | null,
  now: Date = new Date()
): RenewalBanner | null {
  const planName = PLANS[subject.plan].name;

  if (subject.status === "PAST_DUE") {
    return {
      tone: "bad",
      message: `Your last payment for the ${planName} plan didn't go through. Renew now to keep your access.`,
    };
  }

  // Free has nothing to renew; CANCELED/EXPIRED already fell back to Free
  // (see effectivePlan in entitlements.ts) and get an upgrade prompt
  // elsewhere, not a renewal warning.
  if (subject.plan === "FREE" || currentPeriodEnd === null) return null;
  if (subject.status !== "ACTIVE" && subject.status !== "TRIALING") return null;

  const daysLeft = Math.ceil(
    (new Date(currentPeriodEnd).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysLeft < 0) {
    return {
      tone: "bad",
      message: `Your ${planName} plan's billing period ended. Renew soon to keep your access.`,
    };
  }

  if (daysLeft <= SUBSCRIPTION_REMINDER_DAYS) {
    return {
      tone: "warn",
      message:
        daysLeft === 0
          ? `Your ${planName} plan renews today.`
          : `Your ${planName} plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
    };
  }

  return null;
}
