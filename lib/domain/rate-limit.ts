/**
 * App-level rate limiting rules.
 *
 * Pure module: no React, no Supabase, no I/O -- the counting and windowing
 * math lives here so it is cheap to test; lib/data/rate-limit.ts owns talking
 * to Postgres.
 */

export interface RateLimitRule {
  windowSeconds: number;
  /** Hits allowed within the window before the next one is rejected. */
  max: number;
}

export type RateLimitAction =
  | "login"
  | "signup"
  | "password_reset"
  | "invite"
  | "manual_payment";

/**
 * Generous enough that a farmer fumbling their password, or an owner
 * re-sending a few invites, never trips these -- tight enough to blunt a
 * credential-stuffing or email-bombing script. `invite` is scoped per farm
 * (see lib/data/rate-limit.ts's call sites), not per invitee, since the goal
 * is capping how many invites one farm can fire off. `manual_payment` is
 * scoped per account owner the same way -- 5 submissions in a day covers a
 * farmer retrying a typo'd reference number several times over, without
 * leaving the upload+admin-review pipeline open to unbounded spam.
 */
export const RATE_LIMITS: Record<RateLimitAction, RateLimitRule> = {
  login: { windowSeconds: 15 * 60, max: 10 },
  signup: { windowSeconds: 60 * 60, max: 5 },
  password_reset: { windowSeconds: 15 * 60, max: 3 },
  invite: { windowSeconds: 60 * 60, max: 20 },
  manual_payment: { windowSeconds: 24 * 60 * 60, max: 5 },
};

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the oldest hit in the window ages out. Null when allowed. */
  retryAfterSeconds: number | null;
}

/**
 * Whether one more hit is allowed, given the hits already recorded inside
 * the window.
 *
 * `hitsInWindow` is expected to already be filtered to the rule's window (see
 * lib/data/rate-limit.ts's query) -- this function only does the counting and
 * the retry-after math, so it stays a plain, deterministic unit under test.
 */
export function evaluateRateLimit(
  hitsInWindow: readonly Date[],
  rule: RateLimitRule,
  now: Date
): RateLimitDecision {
  if (hitsInWindow.length < rule.max) {
    return { allowed: true, retryAfterSeconds: null };
  }

  const oldest = hitsInWindow.reduce((min, hit) => (hit < min ? hit : min), hitsInWindow[0]);
  const retryAfterMs = oldest.getTime() + rule.windowSeconds * 1000 - now.getTime();

  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

/** Shared wording so every call site reads the same, not independently drifting. */
export function formatRetryMessage(retryAfterSeconds: number | null): string {
  const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
