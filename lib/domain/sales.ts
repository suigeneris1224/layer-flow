/**
 * Egg sale rules.
 *
 * Pure module: no React, no Supabase, no I/O. The arithmetic itself already
 * lives in calculations.ts and is tested there; this module adds the three
 * things a sale needs on top of it -- how a payment status is decided, what is
 * still owed, and whether the farm actually has the eggs.
 */

import {
  checkInventoryAvailability,
  saleItemEggCount,
  saleTotal,
  roundMoney,
  type InventoryBalance,
  type SaleItemInput,
} from "@/lib/domain/calculations";
import type { PaymentStatus } from "@/lib/types/database";

/** One line of a sale: a quantity of one egg size at the price used that day. */
export interface SaleLine extends SaleItemInput {
  eggSizeId: string;
}

/**
 * Payment status is derived, never typed.
 *
 * The farmer enters an amount and the app decides the status. Letting them
 * pick both invites a sale marked PAID with nothing against it, and then
 * "who owes me money" stops being answerable. The database enforces the same
 * three rules in a check constraint, so no client can write a contradiction.
 *
 * A zero-total sale counts as PAID: nothing is owed, and calling an unpriced
 * giveaway a debt would be wrong. Both PAID and UNPAID satisfy the constraint
 * in that case, so the choice is ours to make.
 */
export function derivePaymentStatus(total: number, amountPaid: number): PaymentStatus {
  const owed = roundMoney(Math.max(0, total));
  const paid = roundMoney(Math.max(0, amountPaid));

  if (owed === 0) return "PAID";
  if (paid === 0) return "UNPAID";
  if (paid >= owed) return "PAID";
  return "PARTIAL";
}

/**
 * What is still owed. Never negative -- overpaying is a rounded-up cash
 * payment, not a credit the farm now carries.
 */
export function outstandingBalance(total: number, amountPaid: number): number {
  return roundMoney(Math.max(0, roundMoney(total) - roundMoney(Math.max(0, amountPaid))));
}

export interface SaleSummary {
  /** Money due for the whole sale. */
  total: number;
  /** Eggs leaving stock, per size. Lines of the same size are merged. */
  eggsBySize: Map<string, number>;
  /** Eggs leaving stock across every size. */
  totalEggs: number;
}

/**
 * Roll sale lines into the two numbers the form and the stock guard need.
 *
 * Sizes are merged rather than kept per line: nothing stops a farmer adding
 * Large twice, and stock has to be checked against the combined figure.
 */
export function summariseSale(lines: readonly SaleLine[]): SaleSummary {
  const eggsBySize = new Map<string, number>();

  for (const line of lines) {
    const eggs = saleItemEggCount(line);
    if (eggs <= 0) continue;
    eggsBySize.set(line.eggSizeId, (eggsBySize.get(line.eggSizeId) ?? 0) + eggs);
  }

  let totalEggs = 0;
  for (const eggs of eggsBySize.values()) totalEggs += eggs;

  return { total: saleTotal(lines), eggsBySize, totalEggs };
}

export interface StockWarning {
  eggSizeId: string;
  /** Eggs this sale takes out of the size. */
  requested: number;
  /** Eggs on hand. May be negative. */
  available: number;
  message: string;
}

/**
 * Compare a sale against stock -- and warn rather than refuse.
 *
 * Farms sell before recording the morning collection, so a sale that outruns
 * the balance is usually the *records* being behind, not the farmer being
 * wrong. Blocking it would make the app disagree with reality; instead the
 * sale saves and inventory shows negative in red, which the inventory screen
 * already surfaces. Spec section 15 forbids going negative silently, not at all.
 */
export function checkSaleAgainstStock(
  lines: readonly SaleLine[],
  available: readonly InventoryBalance[],
  sizeNames: ReadonlyMap<string, string>
): StockWarning[] {
  const stock = new Map(available.map((row) => [row.eggSizeId, row.eggsAvailable]));
  const { eggsBySize } = summariseSale(lines);
  const warnings: StockWarning[] = [];

  for (const [eggSizeId, requested] of eggsBySize) {
    // One size at a time, so every shortage is reported rather than just the
    // first. The message comes from the tested checker so the wording the
    // farmer reads is the same one the inventory rules produce elsewhere.
    const check = checkInventoryAvailability(
      new Map([[eggSizeId, requested]]),
      available,
      sizeNames
    );

    if (!check.ok) {
      warnings.push({
        eggSizeId,
        requested,
        available: stock.get(eggSizeId) ?? 0,
        message: check.message,
      });
    }
  }

  return warnings;
}
