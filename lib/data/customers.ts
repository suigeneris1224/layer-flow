import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { outstandingBalance } from "@/lib/domain/sales";
import { logger } from "@/lib/observability/logger";

/**
 * Reading and counting customers.
 *
 * A customer's balance is never a stored column -- it's the same
 * `outstandingBalance()` sum the Sales screen uses for its farm-wide total,
 * just grouped by customer instead. Two queries and a reduce in app code,
 * rather than a database view, mirrors how `getOutstandingTotal` already
 * does this in lib/data/sales.ts.
 */

export interface CustomerEntry {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  outstanding: number;
}

/** Every customer on the farm, with what each currently owes. */
export async function getCustomersWithBalances(farmId: string): Promise<CustomerEntry[]> {
  const supabase = await createSupabaseServerClient();

  const [customers, sales] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, address, notes")
      .eq("farm_id", farmId)
      .order("name"),
    supabase
      .from("egg_sales")
      .select("customer_id, total_amount, amount_paid")
      .eq("farm_id", farmId)
      .not("customer_id", "is", null),
  ]);

  if (customers.error) {
    logger.error("customers lookup failed", { reason: customers.error.message });
    return [];
  }
  if (sales.error) {
    logger.error("customer balances lookup failed", { reason: sales.error.message });
  }

  const balances = new Map<string, number>();
  for (const row of sales.data ?? []) {
    if (!row.customer_id) continue;
    const owed = outstandingBalance(Number(row.total_amount ?? 0), Number(row.amount_paid ?? 0));
    balances.set(row.customer_id, (balances.get(row.customer_id) ?? 0) + owed);
  }

  return customers.data.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    notes: row.notes ?? "",
    outstanding: balances.get(row.id) ?? 0,
  }));
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
