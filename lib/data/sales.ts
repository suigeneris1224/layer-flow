import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import type { PaymentStatus } from "@/lib/types/database";
import { getCurrentPrices, type PricedSize } from "@/lib/data/pricing";
import { INVENTORY_BALANCE_COLUMNS, toInventoryRows } from "@/lib/data/inventory";
import { outstandingBalance } from "@/lib/domain/sales";
import { saleItemEggCount } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";

/**
 * Reading egg sales.
 *
 * The money half of "know your numbers". Until this module the revenue tile on
 * the dashboard read seeded rows only, because nothing in the app could write
 * a sale.
 */

/** How many sales the history screen shows before paging is worth building. */
const SALE_PAGE_LIMIT = 100;

export interface SaleLineEntry {
  sizeName: string;
  quantityTrays: number;
  quantityEggs: number;
  subtotal: number;
}

export interface SaleEntry {
  id: string;
  saleDate: string;
  /** Null for a walk-in cash sale, which is the common case. */
  customerName: string | null;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: PaymentStatus;
  /** Eggs that left stock, across every line. */
  totalEggs: number;
  lines: SaleLineEntry[];
}

export interface SalesRange {
  /** Inclusive YYYY-MM-DD bounds. Both optional. */
  from?: string;
  to?: string;
  limit?: number;
}

type SaleJoin = {
  id: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  payment_status: PaymentStatus;
  customers: { name: string } | { name: string }[] | null;
  egg_sale_items: {
    quantity_eggs: number;
    quantity_trays: number;
    subtotal: number;
    egg_sizes: { name: string } | { name: string }[] | null;
  }[];
};

/** Postgrest returns a to-one join as an object or a single-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Sales newest first, with the customer and what is still owed. */
export async function getSales(
  context: FarmContext,
  range: SalesRange = {}
): Promise<SaleEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("egg_sales")
    .select(
      "id, sale_date, total_amount, amount_paid, payment_status, " +
        "customers(name), " +
        "egg_sale_items(quantity_eggs, quantity_trays, subtotal, egg_sizes(name))"
    )
    .eq("farm_id", context.farmId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(range.limit ?? SALE_PAGE_LIMIT);

  if (range.from) query = query.gte("sale_date", range.from);
  if (range.to) query = query.lte("sale_date", range.to);

  const { data, error } = await query;

  if (error) {
    logger.error("sales lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as SaleJoin[]).map((row) => {
    const items = row.egg_sale_items ?? [];
    const totalAmount = Number(row.total_amount ?? 0);
    const amountPaid = Number(row.amount_paid ?? 0);

    return {
      id: row.id,
      saleDate: row.sale_date,
      customerName: one(row.customers)?.name ?? null,
      totalAmount,
      amountPaid,
      outstanding: outstandingBalance(totalAmount, amountPaid),
      paymentStatus: row.payment_status,
      totalEggs: items.reduce(
        (sum, item) =>
          sum +
          saleItemEggCount({
            quantityEggs: item.quantity_eggs,
            quantityTrays: item.quantity_trays,
          }),
        0
      ),
      lines: items.map((item) => ({
        sizeName: one(item.egg_sizes)?.name ?? "Unknown",
        quantityTrays: item.quantity_trays,
        quantityEggs: item.quantity_eggs,
        subtotal: Number(item.subtotal ?? 0),
      })),
    };
  });
}

/**
 * What the farm is still owed, across every unsettled sale.
 *
 * Summed from the rows rather than trusted to a running total: a stored
 * aggregate can drift, and at MVP volumes this is a handful of rows.
 */
export async function getOutstandingTotal(context: FarmContext): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_sales")
    .select("total_amount, amount_paid")
    .eq("farm_id", context.farmId)
    .in("payment_status", ["PARTIAL", "UNPAID"]);

  if (error) {
    logger.error("outstanding total lookup failed", { reason: error.message });
    return 0;
  }

  return (data ?? []).reduce(
    (sum, row) =>
      sum + outstandingBalance(Number(row.total_amount ?? 0), Number(row.amount_paid ?? 0)),
    0
  );
}

export interface CustomerOption {
  id: string;
  name: string;
}

export interface FlockOption {
  id: string;
  name: string;
}

export interface SizeStock {
  eggSizeId: string;
  eggsAvailable: number;
}

export interface SaleFormData {
  /** Active sizes with the price in force today, to prefill each line. */
  sizes: PricedSize[];
  customers: CustomerOption[];
  flocks: FlockOption[];
  /** Balances so the form can warn about stock while the farmer types. */
  stock: SizeStock[];
}

/** Everything the sale form needs, in one round trip set. */
export async function getSaleFormData(
  context: FarmContext,
  onDate: string
): Promise<SaleFormData> {
  const supabase = await createSupabaseServerClient();

  const [sizes, customers, flocks, balances] = await Promise.all([
    getCurrentPrices(context.farmId, onDate),
    supabase
      .from("customers")
      .select("id, name")
      .eq("farm_id", context.farmId)
      .order("name"),
    supabase
      .from("flocks")
      .select("id, name")
      .eq("farm_id", context.farmId)
      .eq("status", "PRODUCING")
      .order("name"),
    supabase
      .from("egg_inventory_balances")
      .select(INVENTORY_BALANCE_COLUMNS)
      .eq("farm_id", context.farmId)
      .order("sort_order"),
  ]);

  for (const [label, result] of Object.entries({ customers, flocks, balances })) {
    if (result.error) {
      logger.error("sale form query failed", { label, reason: result.error.message });
    }
  }

  return {
    sizes,
    customers: customers.data ?? [],
    flocks: flocks.data ?? [],
    stock: toInventoryRows(balances.data ?? []).map((row) => ({
      eggSizeId: row.eggSizeId,
      eggsAvailable: row.eggsAvailable,
    })),
  };
}

/**
 * Balances and size names, read fresh for the stock guard.
 *
 * The figures the browser is working from may have been on screen for minutes
 * while stock moved, so the warning the farmer is finally shown is computed
 * from this, not from anything the form sent.
 */
export async function getStockForWarning(farmId: string): Promise<{
  balances: SizeStock[];
  names: Map<string, string>;
}> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("egg_inventory_balances")
    .select(INVENTORY_BALANCE_COLUMNS)
    .eq("farm_id", farmId);

  if (error) {
    logger.error("stock lookup for sale failed", { reason: error.message });
    return { balances: [], names: new Map() };
  }

  const rows = toInventoryRows(data ?? []);

  return {
    balances: rows.map((row) => ({ eggSizeId: row.eggSizeId, eggsAvailable: row.eggsAvailable })),
    names: new Map(rows.map((row) => [row.eggSizeId, row.name])),
  };
}

/**
 * How many customers the farm has, for the plan limit.
 *
 * `head: true` asks Postgrest for the count without the rows; RLS still scopes
 * it to this farm, so the number cannot be inflated by another tenant's.
 */
export async function getCustomerCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (error) {
    logger.error("customer count failed", { reason: error.message });
    // Fail closed: an unknown count must not read as "room for more".
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}
