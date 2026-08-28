/**
 * Egg inventory rules.
 *
 * Pure module: no React, no Supabase, no I/O. Everything here is derived from
 * the `egg_inventory_balances` view, which computes
 * `produced + adjusted - sold` per farm per size.
 *
 * Two rules in here exist because getting them wrong is quietly expensive:
 * trays are counted per size, and negative stock is shown rather than hidden.
 */

import { EGGS_PER_TRAY, eggsToTrays } from "@/lib/domain/calculations";

/** One size's balance, as it arrives from the view. */
export interface InventoryRow {
  eggSizeId: string;
  name: string;
  code: string;
  sortOrder: number;
  eggsProduced: number;
  eggsSold: number;
  eggsAdjusted: number;
  eggsAvailable: number;
}

export interface InventoryLine extends InventoryRow {
  /** Whole trays of this size. Zero when the balance is negative. */
  trays: number;
  /** Eggs left over after filling whole trays of this size. */
  looseEggs: number;
}

export interface InventorySummary {
  lines: InventoryLine[];
  /** Sum of available across sizes. May be negative -- that is the point. */
  totalEggs: number;
  /** Sum of per-size trays. NOT floor(totalEggs / 30) -- see below. */
  totalTrays: number;
  looseEggs: number;
  hasNegative: boolean;
}

/**
 * Roll per-size balances into what the screen shows.
 *
 * Trays are summed **per size**, not derived from the blended total. Farmers
 * grade into same-size trays, so 16 loose Large and 27 loose Medium are not a
 * sellable tray between them. Dividing the farm total instead over-reports:
 * with 185/417/526/93/22 the honest answer is 39 trays, while
 * `floor(1243 / 30)` claims 41.
 *
 * Negative balances are carried through untouched. Clamping to zero would turn
 * a data problem the farmer can fix into an invisible one.
 */
export function summariseInventory(rows: readonly InventoryRow[]): InventorySummary {
  const lines = [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      // eggsToTrays floors at zero, so a negative balance yields no trays --
      // which is correct: you cannot sell a tray you do not have.
      const { trays, looseEggs } = eggsToTrays(row.eggsAvailable);
      return { ...row, trays, looseEggs };
    });

  return {
    lines,
    totalEggs: lines.reduce((total, line) => total + line.eggsAvailable, 0),
    totalTrays: lines.reduce((total, line) => total + line.trays, 0),
    looseEggs: lines.reduce((total, line) => total + line.looseEggs, 0),
    hasNegative: lines.some((line) => line.eggsAvailable < 0),
  };
}

export type AdjustmentValidation = { ok: true } | { ok: false; message: string };

/**
 * Guard a stock adjustment.
 *
 * Runs on the server against a freshly read balance -- never against a number
 * the browser supplied, which a farmer could have had stale for minutes.
 */
export function validateAdjustment(
  available: number,
  quantityEggs: number,
  sizeName: string
): AdjustmentValidation {
  if (!Number.isInteger(quantityEggs)) {
    return { ok: false, message: "Enter a whole number of eggs." };
  }

  if (quantityEggs === 0) {
    return { ok: false, message: "Enter how many eggs to add or remove." };
  }

  // Adding is always allowed, including when the balance is already negative:
  // correcting upwards is exactly how a farmer repairs a bad balance.
  if (quantityEggs > 0) return { ok: true };

  const removing = Math.abs(quantityEggs);

  if (available <= 0) {
    // "You only have -20" reads as nonsense, so this case gets its own wording.
    return {
      ok: false,
      message: `You have no ${sizeName} eggs available to remove.`,
    };
  }

  if (removing > available) {
    return {
      ok: false,
      message:
        `You only have ${available.toLocaleString()} ${sizeName} eggs, ` +
        `so you cannot remove ${removing.toLocaleString()}.`,
    };
  }

  return { ok: true };
}

export interface AdjustmentReason {
  value: string;
  label: string;
  /** Whether this reason usually removes stock, used to preset the form. */
  removes: boolean;
}

/**
 * Structured reasons rather than free text, so the same wording is used every
 * time and adjustments can be reported on later. The stored column is text, so
 * adding a reason needs no migration.
 */
export const ADJUSTMENT_REASONS: readonly AdjustmentReason[] = [
  { value: "SPOILAGE", label: "Spoiled or broken", removes: true },
  { value: "OWN_USE", label: "Used by the household", removes: true },
  { value: "GIVEN_AWAY", label: "Given away", removes: true },
  { value: "RECOUNT", label: "Recount correction", removes: false },
  { value: "OTHER", label: "Other", removes: false },
];

export function reasonLabel(value: string): string {
  return ADJUSTMENT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

export { EGGS_PER_TRAY };
