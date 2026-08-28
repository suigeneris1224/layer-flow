/**
 * LayerFlow domain calculations.
 *
 * Every number the farmer sees is derived here. Keep this module pure: no
 * React, no Supabase, no I/O. That is what makes it cheap to test and safe to
 * reuse from server actions, reports, and the offline queue alike.
 */

/** One tray is 30 eggs. Mirrors `app.eggs_per_tray()` in SQL. */
export const EGGS_PER_TRAY = 30;

/**
 * Money is NUMERIC(14,2) in Postgres. In JS we round through integer centavos
 * at every boundary so repeated arithmetic cannot drift into 0.1 + 0.2 land.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

/**
 * Laying rate as a percentage of hens that produced an egg.
 *
 * Returns 0 for an empty house rather than dividing by zero -- a flock with no
 * hens has no rate, and surfacing NaN in the UI helps nobody.
 */
export function layingRate(eggsCollected: number, hensPresent: number): number {
  if (hensPresent <= 0) return 0;
  return roundPercent((eggsCollected / hensPresent) * 100);
}

/** Eggs that can actually be sold: collected minus broken and dirty. */
export function sellableEggs(
  eggsCollected: number,
  brokenEggs: number,
  dirtyEggs: number
): number {
  return Math.max(0, eggsCollected - brokenEggs - dirtyEggs);
}

/** Split a raw egg count into whole trays plus loose eggs. */
export function eggsToTrays(eggs: number): { trays: number; looseEggs: number } {
  const safe = Math.max(0, Math.trunc(eggs));
  return {
    trays: Math.floor(safe / EGGS_PER_TRAY),
    looseEggs: safe % EGGS_PER_TRAY,
  };
}

/** Fractional trays, for totals where a partial tray still has value. */
export function eggsAsTrays(eggs: number): number {
  return Math.max(0, eggs) / EGGS_PER_TRAY;
}

export function traysToEggs(trays: number): number {
  return Math.max(0, Math.trunc(trays)) * EGGS_PER_TRAY;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export function feedCost(quantityKg: number, costPerKg: number): number {
  return roundMoney(Math.max(0, quantityKg) * Math.max(0, costPerKg));
}

/** Kilograms of feed per hen per day. Typical layer range is 0.10-0.13. */
export function feedPerHen(quantityKg: number, hensPresent: number): number {
  if (hensPresent <= 0) return 0;
  return Math.round((quantityKg / hensPresent) * 10000) / 10000;
}

export function feedCostPerEgg(totalFeedCost: number, eggsCollected: number): number {
  if (eggsCollected <= 0) return 0;
  return Math.round((totalFeedCost / eggsCollected) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Egg size breakdown
// ---------------------------------------------------------------------------

export interface EggSizeQuantity {
  eggSizeId: string;
  quantity: number;
}

export interface EggSizeShare extends EggSizeQuantity {
  percentage: number;
}

export function totalBreakdownQuantity(breakdown: readonly EggSizeQuantity[]): number {
  return breakdown.reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
}

/**
 * Share of the day's collection held by each size.
 *
 * Percentages are of the *breakdown total*, not of eggs collected, so the
 * chart still reads correctly while the farmer is mid-entry and has only
 * filled in some of the sizes.
 */
export function eggSizeDistribution(
  breakdown: readonly EggSizeQuantity[]
): EggSizeShare[] {
  const total = totalBreakdownQuantity(breakdown);
  return breakdown.map((row) => ({
    ...row,
    percentage: total <= 0 ? 0 : roundPercent((row.quantity / total) * 100),
  }));
}

export type BreakdownValidation =
  | { ok: true; total: number; unassigned: number }
  | { ok: false; total: number; unassigned: number; message: string };

/**
 * The size breakdown may account for at most the eggs actually collected.
 *
 * Leaving some eggs unassigned is allowed on purpose -- farmers often grade a
 * partial batch and finish later. Only an over-count is an error.
 */
export function validateEggSizeBreakdown(
  eggsCollected: number,
  breakdown: readonly EggSizeQuantity[]
): BreakdownValidation {
  const total = totalBreakdownQuantity(breakdown);
  const unassigned = eggsCollected - total;

  if (total > eggsCollected) {
    return {
      ok: false,
      total,
      unassigned,
      message:
        `Egg sizes add up to ${total.toLocaleString()} but you collected ` +
        `${eggsCollected.toLocaleString()}. Please check the counts.`,
    };
  }

  return { ok: true, total, unassigned };
}

// ---------------------------------------------------------------------------
// Sales revenue
// ---------------------------------------------------------------------------

export interface SaleItemInput {
  quantityEggs: number;
  quantityTrays: number;
  pricePerEgg: number;
  pricePerTray: number;
}

/**
 * Subtotal for one sale line.
 *
 * Trays and loose eggs are priced independently and summed, so a farmer can
 * sell "10 trays and 7 eggs" in a single line without inventing a blended
 * unit price.
 */
export function saleItemSubtotal(item: SaleItemInput): number {
  const trays = Math.max(0, item.quantityTrays) * Math.max(0, item.pricePerTray);
  const eggs = Math.max(0, item.quantityEggs) * Math.max(0, item.pricePerEgg);
  return roundMoney(trays + eggs);
}

export function saleTotal(items: readonly SaleItemInput[]): number {
  return roundMoney(
    items.reduce((sum, item) => sum + saleItemSubtotal(item), 0)
  );
}

/** Total eggs leaving inventory for a sale line. */
export function saleItemEggCount(item: Pick<SaleItemInput, "quantityEggs" | "quantityTrays">): number {
  return Math.max(0, item.quantityEggs) + traysToEggs(item.quantityTrays);
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------

/**
 * Revenue minus operating costs.
 *
 * Always labelled "Estimated Operating Profit" in the UI. It excludes
 * depreciation, owner's draw, and financing, so it is not net income and must
 * never be presented as such.
 */
export function operatingProfit(revenue: number, operatingCosts: number): number {
  return roundMoney(revenue - operatingCosts);
}

export function costPerEgg(operatingCosts: number, eggsProduced: number): number {
  if (eggsProduced <= 0) return 0;
  return Math.round((operatingCosts / eggsProduced) * 10000) / 10000;
}

export function costPerTray(operatingCosts: number, eggsProduced: number): number {
  const trays = eggsAsTrays(eggsProduced);
  if (trays <= 0) return 0;
  return roundMoney(operatingCosts / trays);
}

export function profitPerEgg(
  revenue: number,
  operatingCosts: number,
  eggsProduced: number
): number {
  if (eggsProduced <= 0) return 0;
  return Math.round(((revenue - operatingCosts) / eggsProduced) * 10000) / 10000;
}

export function profitPerTray(
  revenue: number,
  operatingCosts: number,
  eggsProduced: number
): number {
  const trays = eggsAsTrays(eggsProduced);
  if (trays <= 0) return 0;
  return roundMoney((revenue - operatingCosts) / trays);
}

/** Percentage change from a previous period, for period-over-period cards. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundPercent(((current - previous) / Math.abs(previous)) * 100);
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryBalance {
  eggSizeId: string;
  eggsAvailable: number;
}

export type InventoryCheck =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Guard a sale against available stock.
 *
 * Inventory must never silently go negative, so this runs server-side before
 * a sale is written -- client-side checks are a convenience, not the control.
 */
export function checkInventoryAvailability(
  requested: ReadonlyMap<string, number>,
  available: readonly InventoryBalance[],
  sizeNames: ReadonlyMap<string, string>
): InventoryCheck {
  const stock = new Map(available.map((row) => [row.eggSizeId, row.eggsAvailable]));

  for (const [eggSizeId, wanted] of requested) {
    const onHand = stock.get(eggSizeId) ?? 0;
    if (wanted > onHand) {
      const name = sizeNames.get(eggSizeId) ?? "these";
      return {
        ok: false,
        message:
          `Not enough ${name} eggs available for this sale. ` +
          `You have ${onHand.toLocaleString()}, this sale needs ${wanted.toLocaleString()}.`,
      };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Flock age
// ---------------------------------------------------------------------------

/**
 * Age in weeks since placement. Layer performance is always discussed in
 * weeks, never days -- peak lay is "week 26-30", not "day 182".
 */
export function flockAgeWeeks(placementDate: string | Date, asOf: Date = new Date()): number {
  const placed = typeof placementDate === "string" ? new Date(placementDate) : placementDate;
  if (Number.isNaN(placed.getTime())) return 0;
  const days = Math.floor((asOf.getTime() - placed.getTime()) / 86_400_000);
  return Math.max(0, Math.floor(days / 7));
}
