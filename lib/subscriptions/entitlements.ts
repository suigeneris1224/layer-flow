import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLANS,
  type Feature,
  type LimitKey,
  nextPlanForLimit,
  requiredPlanFor,
} from "@/lib/subscriptions/plans";

/**
 * Entitlement checks.
 *
 * The server is the enforcement point: every create path calls `assertCanCreate`
 * before writing. Client-side checks exist only to avoid showing a farmer a
 * button that will reject them.
 */

/**
 * A lapsed subscription falls back to Free rather than locking the farm out.
 *
 * Farmers must always be able to reach their own records -- a billing problem
 * should never cost someone their production history.
 */
export function effectivePlan(
  plan: SubscriptionPlan,
  status: SubscriptionStatus
): SubscriptionPlan {
  const lapsed = status === "CANCELED" || status === "EXPIRED";
  return lapsed ? "FREE" : plan;
}

export interface Entitled {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
}

export function canAccess(subject: Entitled, feature: Feature): boolean {
  const plan = effectivePlan(subject.plan, subject.status);
  return PLANS[plan].features.includes(feature);
}

export function getPlanLimit(subject: Entitled, key: LimitKey): number | null {
  const plan = effectivePlan(subject.plan, subject.status);
  return PLANS[plan].limits[key];
}

/** Would creating one more of `key` exceed the plan? */
export function canCreate(
  subject: Entitled,
  key: LimitKey,
  currentCount: number
): boolean {
  const limit = getPlanLimit(subject, key);
  if (limit === null) return true;
  return currentCount < limit;
}

export interface UpgradePrompt {
  title: string;
  message: string;
  suggestedPlan: SubscriptionPlan | null;
  ctaLabel: string;
}

export function limitReachedPrompt(
  subject: Entitled,
  key: LimitKey,
  currentCount: number
): UpgradePrompt {
  const plan = effectivePlan(subject.plan, subject.status);
  const limit = getPlanLimit(subject, key) ?? currentCount;
  const label = limit === 1 ? LIMIT_LABELS[key].singular : LIMIT_LABELS[key].plural;
  const suggested = nextPlanForLimit(plan, key);
  const suggestedLimit = suggested ? PLANS[suggested].limits[key] : null;

  const upgradeLine = suggested
    ? `Upgrade to ${PLANS[suggested].name} to ${
        suggestedLimit === null
          ? `add unlimited ${LIMIT_LABELS[key].plural}`
          : `manage up to ${suggestedLimit} ${
              suggestedLimit === 1 ? LIMIT_LABELS[key].singular : LIMIT_LABELS[key].plural
            }`
      }.`
    : `You are on our largest plan. Contact us if you need more.`;

  return {
    title: `You've reached the ${limit} ${label} limit on ${PLANS[plan].name}.`,
    message: upgradeLine,
    suggestedPlan: suggested,
    ctaLabel: suggested ? `Upgrade to ${PLANS[suggested].name}` : "Contact support",
  };
}

export function featureLockedPrompt(subject: Entitled, feature: Feature): UpgradePrompt {
  const required = requiredPlanFor(feature);
  return {
    title: FEATURE_LABELS[feature],
    message: required
      ? `Available on ${PLANS[required].name}.`
      : "This feature is not available on your plan.",
    suggestedPlan: required,
    ctaLabel: required ? `Upgrade to ${PLANS[required].name}` : "See plans",
  };
}

/**
 * Thrown when a server action is asked to exceed a plan limit. Carries a
 * farmer-readable prompt rather than a bare error string.
 */
export class EntitlementError extends Error {
  readonly prompt: UpgradePrompt;

  constructor(prompt: UpgradePrompt) {
    super(`${prompt.title} ${prompt.message}`);
    this.name = "EntitlementError";
    this.prompt = prompt;
  }
}

export function assertCanCreate(
  subject: Entitled,
  key: LimitKey,
  currentCount: number
): void {
  if (!canCreate(subject, key, currentCount)) {
    throw new EntitlementError(limitReachedPrompt(subject, key, currentCount));
  }
}

export function assertCanAccess(subject: Entitled, feature: Feature): void {
  if (!canAccess(subject, feature)) {
    throw new EntitlementError(featureLockedPrompt(subject, feature));
  }
}

/**
 * Oldest date the farm may read, given its history limit. `null` means all of
 * it. Downgrading never deletes data -- it only narrows the window.
 */
export function historyCutoffDate(subject: Entitled, now: Date = new Date()): Date | null {
  const days = getPlanLimit(subject, "history_days");
  if (days === null) return null;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
