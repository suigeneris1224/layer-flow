import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/lib/types/database";
import { getFlocks, type FlockEntry } from "@/lib/data/flocks";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/domain/expenses";
import { roundMoney } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";
import type { FarmContext } from "@/lib/auth/session";
import type { ResolvedRange } from "@/lib/domain/reports";

/**
 * Reading expenses.
 *
 * An append-mostly transaction log, same shape as egg sales -- so pagination
 * mirrors `getSales`/`getSalesCount` in lib/data/sales.ts rather than the
 * flat, unpaginated lists Houses/Flocks use.
 */

export interface ExpenseEntry {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  flockName: string | null;
}

export interface ExpensesRange {
  limit?: number;
  offset?: number;
}

const EXPENSES_PAGE_LIMIT = 100;

type ExpenseJoin = {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  flocks: { name: string } | { name: string }[] | null;
};

/** Postgrest returns a to-one join as an object or a single-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Expenses newest first. */
export async function getExpenses(
  farmId: string,
  range: ExpensesRange = {}
): Promise<ExpenseEntry[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("expenses")
    .select("id, expense_date, category, description, amount, flocks(name)")
    .eq("farm_id", farmId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const limit = range.limit ?? EXPENSES_PAGE_LIMIT;
  query =
    range.offset !== undefined
      ? query.range(range.offset, range.offset + limit - 1)
      : query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error("expenses lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as ExpenseJoin[]).map((row) => ({
    id: row.id,
    expenseDate: row.expense_date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount ?? 0),
    flockName: one(row.flocks)?.name ?? null,
  }));
}

/** How many expenses the farm has on record, for pagination. */
export async function getExpensesCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (error) {
    logger.error("expenses count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

export interface ExpenseFormData {
  flocks: Pick<FlockEntry, "id" | "name">[];
}

/**
 * Flocks for the optional flock picker.
 *
 * Every flock, not just PRODUCING ones -- an expense can be recorded against
 * a retired flock's leftover costs, unlike a sale line.
 */
export async function getExpenseFormData(farmId: string): Promise<ExpenseFormData> {
  const flocks = await getFlocks(farmId);
  return { flocks: flocks.map((flock) => ({ id: flock.id, name: flock.name })) };
}

export interface CategoryBreakdownRow {
  category: ExpenseCategory;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

/** Spend grouped by the fixed expense_category enum, over a date range. */
export async function getExpensesByCategory(
  context: FarmContext,
  range: ResolvedRange
): Promise<CategoryBreakdownRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .eq("farm_id", context.farmId)
    .gte("expense_date", range.from)
    .lte("expense_date", range.to);

  if (error) {
    logger.error("expense category breakdown failed", { reason: error.message });
    return [];
  }

  const rows = (data ?? []) as { category: ExpenseCategory; amount: number }[];
  const byCategory = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const row of rows) {
    const entry = byCategory.get(row.category) ?? { total: 0, count: 0 };
    entry.total += Number(row.amount ?? 0);
    entry.count += 1;
    byCategory.set(row.category, entry);
  }

  const grandTotal = [...byCategory.values()].reduce((sum, entry) => sum + entry.total, 0);

  return [...byCategory.entries()]
    .map(([category, entry]) => ({
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      total: roundMoney(entry.total),
      count: entry.count,
      percentage: grandTotal > 0 ? Math.round((entry.total / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
