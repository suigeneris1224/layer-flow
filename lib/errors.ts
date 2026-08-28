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
  daily_production_damaged_within_collected:
    "Broken and dirty eggs cannot add up to more than the eggs you collected.",
  flocks_current_hens_within_initial:
    "A flock cannot have more hens now than it started with.",
  mortality_records_daily_production_id_key:
    "This production record already has a mortality entry.",
  egg_sale_items_nonempty: "Each sale line needs at least one tray or one egg.",
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

  const byCode = error.code ? CODE_MESSAGES[error.code] : undefined;
  if (byCode) return failure(byCode);

  return failure("We couldn't save that. Please try again.");
}

/** Supabase Auth errors, which have their own vocabulary. */
export function describeAuthError(message: string): ActionFailure {
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

  logger.warn("unmapped auth error", { message });
  return failure("We couldn't sign you in. Please try again.");
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
