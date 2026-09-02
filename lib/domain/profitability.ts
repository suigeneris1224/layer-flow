import { operatingCostsFromExpenses, operatingProfit, roundMoney } from "@/lib/domain/calculations";

/**
 * Per-flock revenue/cost/profit attribution.
 *
 * Shared by Reports (`lib/data/reports.ts`, a farmer-chosen date range) and
 * the dashboard's flock-loss alert (`lib/data/dashboard.ts`, a fixed trailing
 * week) so the two can never disagree about how a sale, expense or feed
 * delivery is attributed to a flock.
 *
 * Revenue and cost only count when attributed to a flock (`flock_id` set).
 * Walk-in sales and farm-wide expenses show as "Unassigned" so the numbers
 * here never silently disagree with farm-wide totals computed elsewhere.
 */

export interface FlockProfitInput {
  id: string;
  name: string;
}

export interface FlockProfitRow {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
}

type SaleRow = { total_amount: number; flock_id: string | null };
type ExpenseRow = { amount: number; category: string; flock_id: string | null };
type FeedRow = { total_cost: number; flock_id: string };

export function attributeFlockProfitability(
  flocks: readonly FlockProfitInput[],
  sales: readonly SaleRow[],
  expenses: readonly ExpenseRow[],
  feed: readonly FeedRow[],
  includeUnassigned = true
): FlockProfitRow[] {
  const revenueByFlock = new Map<string, number>();
  let unassignedRevenue = 0;
  for (const row of sales) {
    const amount = Number(row.total_amount);
    if (row.flock_id) {
      revenueByFlock.set(row.flock_id, (revenueByFlock.get(row.flock_id) ?? 0) + amount);
    } else {
      unassignedRevenue += amount;
    }
  }

  // feed_usage.flock_id is required by the schema, so feed cost is always
  // attributable -- unlike sales and expenses, there is no "unassigned" case.
  const feedCostByFlock = new Map<string, number>();
  for (const row of feed) {
    feedCostByFlock.set(row.flock_id, (feedCostByFlock.get(row.flock_id) ?? 0) + Number(row.total_cost));
  }

  const expensesByFlock = new Map<string, ExpenseRow[]>();
  const unassignedExpenses: ExpenseRow[] = [];
  for (const row of expenses) {
    if (row.flock_id) {
      const list = expensesByFlock.get(row.flock_id) ?? [];
      list.push(row);
      expensesByFlock.set(row.flock_id, list);
    } else {
      unassignedExpenses.push(row);
    }
  }

  const rows: FlockProfitRow[] = flocks.map((flock) => {
    const revenue = roundMoney(revenueByFlock.get(flock.id) ?? 0);
    const cost = operatingCostsFromExpenses(
      feedCostByFlock.get(flock.id) ?? 0,
      expensesByFlock.get(flock.id) ?? []
    );
    return { id: flock.id, name: flock.name, revenue, cost, profit: operatingProfit(revenue, cost) };
  });

  const unassignedCost = operatingCostsFromExpenses(0, unassignedExpenses);
  if (includeUnassigned && (unassignedRevenue > 0 || unassignedCost > 0)) {
    rows.push({
      id: "unassigned",
      name: "Unassigned",
      revenue: roundMoney(unassignedRevenue),
      cost: unassignedCost,
      profit: operatingProfit(unassignedRevenue, unassignedCost),
    });
  }

  return rows.sort((a, b) => b.profit - a.profit);
}
