import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { operatingCostsFromExpenses, operatingProfit, roundMoney } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";
import type { ResolvedRange } from "@/lib/domain/reports";

/**
 * Revenue/cost/profit compared across every farm a Pro user belongs to.
 *
 * Three grouped `.in("farm_id", farmIds)` queries rather than one round trip
 * per farm, mirroring `getFarmCardsForUser` (lib/data/farms.ts). RLS
 * (`app.is_farm_member(farm_id)`) already scopes every row to farms the
 * caller belongs to, so this is safe as long as `farms` itself came from the
 * caller's own `getUserFarms()` rather than client input -- callers must not
 * pass arbitrary farm ids through from a query string.
 */

export interface CrossFarmRow {
  farmId: string;
  farmName: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CrossFarmReportsData {
  range: ResolvedRange;
  rows: CrossFarmRow[];
  totals: { revenue: number; cost: number; profit: number };
}

type SaleRow = { farm_id: string; total_amount: number };
type ExpenseRow = { farm_id: string; amount: number; category: string };
type FeedRow = { farm_id: string; total_cost: number };

export async function getCrossFarmReportsData(
  farms: readonly { farmId: string; farmName: string }[],
  range: ResolvedRange
): Promise<CrossFarmReportsData> {
  if (farms.length === 0) {
    return { range, rows: [], totals: { revenue: 0, cost: 0, profit: 0 } };
  }

  const supabase = await createSupabaseServerClient();
  const farmIds = farms.map((farm) => farm.farmId);

  const [sales, expenses, feed] = await Promise.all([
    supabase
      .from("egg_sales")
      .select("farm_id, total_amount")
      .in("farm_id", farmIds)
      .gte("sale_date", range.from)
      .lte("sale_date", range.to),
    supabase
      .from("expenses")
      .select("farm_id, amount, category")
      .in("farm_id", farmIds)
      .gte("expense_date", range.from)
      .lte("expense_date", range.to),
    supabase
      .from("feed_usage")
      .select("farm_id, total_cost")
      .in("farm_id", farmIds)
      .gte("usage_date", range.from)
      .lte("usage_date", range.to),
  ]);

  if (sales.error) logger.error("cross-farm sales lookup failed", { reason: sales.error.message });
  if (expenses.error) {
    logger.error("cross-farm expenses lookup failed", { reason: expenses.error.message });
  }
  if (feed.error) logger.error("cross-farm feed lookup failed", { reason: feed.error.message });

  const revenueByFarm = groupSum((sales.data ?? []) as SaleRow[], "total_amount");
  const feedCostByFarm = groupSum((feed.data ?? []) as FeedRow[], "total_cost");
  const expensesByFarm = groupRows((expenses.data ?? []) as ExpenseRow[]);

  const rows = farms.map((farm) => {
    const revenue = roundMoney(revenueByFarm.get(farm.farmId) ?? 0);
    const cost = operatingCostsFromExpenses(
      feedCostByFarm.get(farm.farmId) ?? 0,
      expensesByFarm.get(farm.farmId) ?? []
    );
    return {
      farmId: farm.farmId,
      farmName: farm.farmName,
      revenue,
      cost,
      profit: operatingProfit(revenue, cost),
    };
  });

  const totals = rows.reduce(
    (running, row) => ({
      revenue: roundMoney(running.revenue + row.revenue),
      cost: roundMoney(running.cost + row.cost),
      profit: roundMoney(running.profit + row.profit),
    }),
    { revenue: 0, cost: 0, profit: 0 }
  );

  return { range, rows, totals };
}

function groupSum<T extends { farm_id: string }>(
  rows: readonly T[],
  key: keyof T
): Map<string, number> {
  const byFarm = new Map<string, number>();
  for (const row of rows) {
    byFarm.set(row.farm_id, (byFarm.get(row.farm_id) ?? 0) + Number(row[key]));
  }
  return byFarm;
}

function groupRows(rows: readonly ExpenseRow[]): Map<string, ExpenseRow[]> {
  const byFarm = new Map<string, ExpenseRow[]>();
  for (const row of rows) {
    const list = byFarm.get(row.farm_id) ?? [];
    list.push(row);
    byFarm.set(row.farm_id, list);
  }
  return byFarm;
}
