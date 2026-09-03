import type { PostgrestError } from "@supabase/supabase-js";
import { EntitlementError } from "@/lib/subscriptions/entitlements";
import { logger } from "@/lib/observability/logger";

/**
 * Turning database and auth failures into something a farmer can act on.
 *
 * Raw Postgres text ("duplicate key value violates unique constraint
 * daily_production_flock_id_production_date_key") tells the farmer nothing and
 * leaks our schema. Everything user-facing goes through here.
 */

export interface ActionFailure {
  ok: false;
  error: string;
  /** Field-level errors, keyed by form field name. */
  fieldErrors?: Record<string, string>;
  /** Set when the failure is a plan limit, so the UI can offer an upgrade. */
  upgrade?: { plan: string | null; cta: string };
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | ActionFailure;

export function failure(
  error: string,
  fieldErrors?: Record<string, string>
): ActionFailure {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Constraint names mapped to the sentence we actually want to show. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  daily_production_flock_id_production_date_key:
    "This flock already has a production record for this date. Open that record to edit it.",
  houses_farm_id_name_key: "You already have a house with this name.",
  egg_sizes_farm_id_code_key: "This egg size already exists on your farm.",
  egg_prices_no_overlap:
    "A price for this egg size already covers these dates. Close the old price first.",
  farm_members_farm_id_user_id_key: "This person is already a member of the farm.",
  farm_invitations_pending_key:
    "You already have an open invitation for this email. Cancel it first, or send them the existing link.",
  daily_production_damaged_within_collected:
    "Broken and dirty eggs cannot add up to more than the eggs you collected.",
  flocks_current_hens_within_initial:
    "A flock cannot have more hens now than it started with.",
  mortality_records_daily_production_id_key:
    "This production record already has a mortality entry.",
  egg_sale_items_nonempty: "Each sale line needs at least one tray or one egg.",
  // Safety net for a race between the app's own precheck and the delete --
  // the precheck (houseHasFlocks) already blocks this in the normal case.
  flocks_house_id_fkey:
    "This house has a flock recorded against it, including past ones. Houses with any flock history cannot be deleted.",
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "That record already exists.",
  "23503": "That item no longer exists. Refresh the page and try again.",
  "23514": "Some of those numbers don't add up. Please check and try again.",
  "42501": "You don't have permission to do that.",
  PGRST301: "Your session expired. Please sign in again.",
};

function matchConstraint(text: string): string | null {
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (text.includes(constraint)) return message;
  }
  return null;
}

/**
 * Map a Postgrest error to a farmer-readable message.
 *
 * The original is logged with full detail for us; only the safe sentence
 * crosses to the browser.
 */
export function describeDatabaseError(
  error: PostgrestError,
  context: string
): ActionFailure {
  logger.error("database error", {
    context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  // Postgrest folds the constraint name into `message`/`details`, so a
  // substring match over both is how we recognise which rule fired.
  const haystack = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;

  const byConstraint = matchConstraint(haystack);
  if (byConstraint) return failure(byConstraint);

  // Our own RAISE EXCEPTION messages from trigger guards are already written
  // for people, so pass those through.
  if (haystack.includes("Egg size breakdown")) {
    return failure(
      "The egg sizes add up to more eggs than you collected. Please check the counts."
    );
  }
  if (haystack.includes("does not belong to farm")) {
    return failure("That house belongs to a different farm.");
  }

  /*
   * accept_farm_invitation raises with generic errcodes, which the table below
   * would turn into nonsense -- an expired invitation is a check_violation, and
   * "Some of those numbers don't add up" is not what happened. Match the
   * message instead, and say the one thing the person can act on.
   */
  if (haystack.includes("Invitation expired")) {
    return failure("That invitation has expired. Ask the farm owner for a new link.");
  }
  if (haystack.includes("Invitation already used")) {
    return failure("That invitation has already been used.");
  }
  if (haystack.includes("Invitation not found")) {
    return failure("That invitation link is not valid.");
  }

  const byCode = error.code ? CODE_MESSAGES[error.code] : undefined;
  if (byCode) return failure(byCode);

  return failure("We couldn't save that. Please try again.");
}

const AUTH_FALLBACK_MESSAGES = {
  signIn: "We couldn't sign you in. Please try again.",
  signUp: "We couldn't create your account. Please try again.",
  password: "We couldn't update your password. Please try again.",
} as const;

/**
 * Supabase Auth errors, which have their own vocabulary.
 *
 * `context` only affects the generic fallback below -- signInAction,
 * signUpAction and updatePasswordAction all funnel through here, and a
 * fallback fixed to "We couldn't sign you in" was showing on signup and
 * password-reset failures too, telling someone who was never signing in that
 * they couldn't sign in.
 */
export function describeAuthError(
  message: string,
  context: keyof typeof AUTH_FALLBACK_MESSAGES = "signIn"
): ActionFailure {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return failure("That email or password is incorrect.");
  }
  if (normalized.includes("email not confirmed")) {
    return failure("Please confirm your email address first. Check your inbox.");
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return failure("An account with this email already exists. Try signing in.");
  }
  if (normalized.includes("password should be at least")) {
    return failure("Your password must be at least 8 characters.");
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return failure("Too many attempts. Please wait a minute and try again.");
  }

  logger.warn("unmapped auth error", { message, context });
  return failure(AUTH_FALLBACK_MESSAGES[context]);
}

/** Catch-all for a server action, so nothing raw ever reaches the client. */
export function describeUnknownError(error: unknown, context: string): ActionFailure {
  if (error instanceof EntitlementError) {
    return {
      ok: false,
      error: `${error.prompt.title} ${error.prompt.message}`,
      upgrade: { plan: error.prompt.suggestedPlan, cta: error.prompt.ctaLabel },
    };
  }

  logger.error("unhandled action error", {
    context,
    message: error instanceof Error ? error.message : String(error),
  });

  return failure("Something went wrong. Please try again.");
}
