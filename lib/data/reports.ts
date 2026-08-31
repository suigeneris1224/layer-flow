import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import { canAccess } from "@/lib/subscriptions/entitlements";
import { getFlocks } from "@/lib/data/flocks";
import {
  operatingCostsFromExpenses,
  operatingProfit,
  percentChange,
  roundMoney,
} from "@/lib/domain/calculations";
import { shiftDate } from "@/lib/format";
import { logger } from "@/lib/observability/logger";
import {
  daysBetween,
  eachDate,
  sameRangeLastYear,
  type ResolvedRange,
} from "@/lib/domain/reports";

/**
 * Money-side insights: revenue/cost/profit trend, and (Pro) per-flock
 * profitability, over a farmer-chosen date range.
 */

export interface DailyMoneyPoint {
  day: string;
  revenue: number;
  cost: number;
}

export interface FlockProfitRow {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ReportsData {
  range: ResolvedRange;
  totals: {
    revenue: number;
    cost: number;
    profit: number;
    /** Profit as a percentage of revenue. Null when there's no revenue to divide by. */
    margin: number | null;
  };
  deltas: {
    revenue: number | null;
    cost: number | null;
    profit: number | null;
  };
  /**
   * The same window a year earlier. Null when there is nothing recorded then,
   * which is most farms -- showing a panel of zeros and "-100%" would read as
   * a collapse rather than as an absence of history.
   */
  lastYear: {
    from: string;
    to: string;
    revenue: number;
    cost: number;
    profit: number;
    deltas: { revenue: number | null; cost: number | null; profit: number | null };
  } | null;
  chart: DailyMoneyPoint[];
  /** Only populated when the farm's plan includes advanced_reports. */
  flockProfitability: FlockProfitRow[] | null;
}

type SaleRow = { sale_date: string; total_amount: number; flock_id: string | null };
type ExpenseRow = { expense_date: string; amount: number; category: string; flock_id: string | null };
type FeedRow = { usage_date: string; total_cost: number; flock_id: string };

function sum<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

async function fetchPeriod(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  farmId: string,
  from: string,
  to: string,
  hasSales: boolean
) {
  const [sales, expenses, feed] = await Promise.all([
    hasSales
      ? supabase
          .from("egg_sales")
          .select("sale_date, total_amount, flock_id")
          .eq("farm_id", farmId)
          .gte("sale_date", from)
          .lte("sale_date", to)
      : Promise.resolve({ data: [] as SaleRow[], error: null }),
    supabase
      .from("expenses")
      .select("expense_date, amount, category, flock_id")
      .eq("farm_id", farmId)
      .gte("expense_date", from)
      .lte("expense_date", to),
    supabase
      .from("feed_usage")
      .select("usage_date, total_cost, flock_id")
      .eq("farm_id", farmId)
      .gte("usage_date", from)
      .lte("usage_date", to),
  ]);

  if (sales.error) logger.error("reports sales lookup failed", { reason: sales.error.message });
  if (expenses.error) {
    logger.error("reports expenses lookup failed", { reason: expenses.error.message });
  }
  if (feed.error) logger.error("reports feed lookup failed", { reason: feed.error.message });

  return {
    sales: (sales.data ?? []) as SaleRow[],
    expenses: (expenses.data ?? []) as ExpenseRow[],
    feed: (feed.data ?? []) as FeedRow[],
  };
}

export const getReportsData = cache(async function getReportsData(
  context: FarmContext,
  range: ResolvedRange
): Promise<ReportsData> {
  const supabase = await createSupabaseServerClient();
  const rangeDays = daysBetween(range.from, range.to);
  const previousEnd = shiftDate(range.from, -1);
  const previousStart = shiftDate(previousEnd, -(rangeDays - 1));
  const yearAgo = sameRangeLastYear(range.from, range.to);

  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const hasSales = canAccess(entitlement, "egg_sales");
  const hasAdvanced = canAccess(entitlement, "advanced_reports");

  const [current, previous, lastYearPeriod, flocks] = await Promise.all([
    fetchPeriod(supabase, context.farmId, range.from, range.to, hasSales),
    fetchPeriod(supabase, context.farmId, previousStart, previousEnd, hasSales),
    fetchPeriod(supabase, context.farmId, yearAgo.from, yearAgo.to, hasSales),
    hasAdvanced ? getFlocks(context.farmId) : Promise.resolve([]),
  ]);

  const revenue = roundMoney(sum(current.sales, (row) => Number(row.total_amount)));
  const feedCost = sum(current.feed, (row) => Number(row.total_cost));
  const cost = operatingCostsFromExpenses(feedCost, current.expenses);
  const profit = operatingProfit(revenue, cost);

  const revenuePrev = roundMoney(sum(previous.sales, (row) => Number(row.total_amount)));
  const feedCostPrev = sum(previous.feed, (row) => Number(row.total_cost));
  const costPrev = operatingCostsFromExpenses(feedCostPrev, previous.expenses);
  const profitPrev = operatingProfit(revenuePrev, costPrev);

  const revenueYoY = roundMoney(sum(lastYearPeriod.sales, (row) => Number(row.total_amount)));
  const feedCostYoY = sum(lastYearPeriod.feed, (row) => Number(row.total_cost));
  const costYoY = operatingCostsFromExpenses(feedCostYoY, lastYearPeriod.expenses);
  const profitYoY = operatingProfit(revenueYoY, costYoY);
  const hadLastYear =
    lastYearPeriod.sales.length > 0 ||
    lastYearPeriod.feed.length > 0 ||
    lastYearPeriod.expenses.length > 0;

  return {
    range,
    totals: {
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
    },
    deltas: {
      revenue: percentChange(revenue, revenuePrev),
      cost: percentChange(cost, costPrev),
      profit: percentChange(profit, profitPrev),
    },
    lastYear: hadLastYear
      ? {
          from: yearAgo.from,
          to: yearAgo.to,
          revenue: revenueYoY,
          cost: costYoY,
          profit: profitYoY,
          deltas: {
            revenue: percentChange(revenue, revenueYoY),
            cost: percentChange(cost, costYoY),
            profit: percentChange(profit, profitYoY),
          },
        }
      : null,
    chart: buildDailySeries(current.sales, current.feed, current.expenses, range),
    flockProfitability: hasAdvanced
      ? buildFlockProfitability(flocks, current.sales, current.expenses, current.feed)
      : null,
  };
});

function buildDailySeries(
  sales: readonly SaleRow[],
  feed: readonly FeedRow[],
  expenses: readonly ExpenseRow[],
  range: ResolvedRange
): DailyMoneyPoint[] {
  const revenueByDate = new Map<string, number>();
  for (const row of sales) {
    revenueByDate.set(row.sale_date, (revenueByDate.get(row.sale_date) ?? 0) + Number(row.total_amount));
  }

  const feedByDate = new Map<string, number>();
  for (const row of feed) {
    feedByDate.set(row.usage_date, (feedByDate.get(row.usage_date) ?? 0) + Number(row.total_cost));
  }

  const expensesByDate = new Map<string, ExpenseRow[]>();
  for (const row of expenses) {
    const list = expensesByDate.get(row.expense_date) ?? [];
    list.push(row);
    expensesByDate.set(row.expense_date, list);
  }

  return eachDate(range.from, range.to).map((date) => ({
    day: date.slice(5),
    revenue: roundMoney(revenueByDate.get(date) ?? 0),
    cost: operatingCostsFromExpenses(feedByDate.get(date) ?? 0, expensesByDate.get(date) ?? []),
  }));
}

/**
 * Revenue and cost only count when attributed to a flock (`flock_id` set).
 * Walk-in sales and farm-wide expenses show as "Unassigned" so the numbers
 * here never silently disagree with the farm-wide totals above.
 */
function buildFlockProfitability(
  flocks: Awaited<ReturnType<typeof getFlocks>>,
  sales: readonly SaleRow[],
  expenses: readonly ExpenseRow[],
  feed: readonly FeedRow[]
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
  if (unassignedRevenue > 0 || unassignedCost > 0) {
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
