/**
 * Egg pricing rules.
 *
 * Pure module: no React, no Supabase, no I/O.
 *
 * `egg_prices` stores effective-dated rows guarded by a GiST exclusion
 * constraint, so changing a price is never a simple UPDATE -- it is a close of
 * the old range plus an insert of the new one, and the two must agree about
 * dates or the constraint rejects the whole thing. Working out *which* shape a
 * change takes is decided here, before any SQL runs.
 */

import { EGGS_PER_TRAY, percentChange } from "@/lib/domain/calculations";
import { shiftDate } from "@/lib/format";

/** The row currently in force for one egg size. */
export interface CurrentPrice {
  id: string;
  eggSizeId: string;
  pricePerEgg: number;
  pricePerTray: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type PriceChangePlan =
  | { action: "insert" }
  | { action: "replace"; rowId: string }
  | { action: "close-and-insert"; rowId: string; closeOldAt: string };

export type PlanResult =
  | { ok: true; plan: PriceChangePlan }
  | { ok: false; message: string };

export type DateValidation = { ok: true } | { ok: false; message: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prices take effect today or later.
 *
 * Backdating is refused on purpose. It cannot rewrite history anyway --
 * `egg_sale_items` copies the price onto the line at sale time -- so it would
 * only confuse which price is "current" while making the overlap rules much
 * harder to reason about.
 */
export function validateEffectiveFrom(effectiveFrom: string, today: string): DateValidation {
  if (!ISO_DATE.test(effectiveFrom)) {
    return { ok: false, message: "Choose a valid date." };
  }
  if (effectiveFrom < today) {
    return { ok: false, message: "A price can start today or later, not in the past." };
  }
  return { ok: true };
}

/**
 * Decide how to apply a price change.
 *
 * Dates are ISO strings throughout, so plain string comparison is date
 * comparison -- no timezone can creep in.
 */
export function planPriceChange(
  current: CurrentPrice | null,
  effectiveFrom: string,
  today: string
): PlanResult {
  const dateCheck = validateEffectiveFrom(effectiveFrom, today);
  if (!dateCheck.ok) return { ok: false, message: dateCheck.message };

  if (!current) return { ok: true, plan: { action: "insert" } };

  if (effectiveFrom === current.effectiveFrom) {
    /*
     * Same start date: replace the row rather than close it. Closing would set
     * effective_to to the day BEFORE effective_from and violate
     * egg_prices_range_valid. Correcting a price shortly after setting it is
     * ordinary behaviour, not an edge case.
     */
    return { ok: true, plan: { action: "replace", rowId: current.id } };
  }

  if (effectiveFrom < current.effectiveFrom) {
    return {
      ok: false,
      message:
        `A price change is already scheduled to start on ${current.effectiveFrom}. ` +
        `Choose that date or later.`,
    };
  }

  // The exclusion constraint's upper bound is inclusive, so the old price runs
  // through the day before the new one starts.
  return {
    ok: true,
    plan: {
      action: "close-and-insert",
      rowId: current.id,
      closeOldAt: shiftDate(effectiveFrom, -1),
    },
  };
}

/**
 * What a tray price works out to per egg.
 *
 * Shown beside the input as a typo guard: entering 21 instead of 210 implies
 * 70 centavos an egg, which is obviously wrong at a glance.
 */
export function impliedPricePerEgg(pricePerTray: number): number {
  if (!Number.isFinite(pricePerTray) || pricePerTray <= 0) return 0;
  return Math.round((pricePerTray / EGGS_PER_TRAY) * 10000) / 10000;
}

export interface PriceChangeSummary {
  direction: "up" | "down" | "same";
  /** Null when there is no previous price to compare against. */
  percent: number | null;
}

export function describePriceChange(previous: number, next: number): PriceChangeSummary {
  if (previous === next) return { direction: "same", percent: 0 };

  return {
    direction: next > previous ? "up" : "down",
    percent: percentChange(next, previous),
  };
}

export type PriceStanding = "previous" | "current" | "scheduled";

/**
 * Where a price row sits relative to a date.
 *
 * `effective_to` is INCLUSIVE, matching the exclusion constraint, so a row
 * ending today is still in force today. Getting this wrong showed the same
 * price under both "Current" and "Previous" at once.
 */
export function classifyPrice(
  row: { effectiveFrom: string; effectiveTo: string | null },
  today: string
): PriceStanding {
  if (row.effectiveFrom > today) return "scheduled";
  if (row.effectiveTo !== null && row.effectiveTo < today) return "previous";
  return "current";
}
