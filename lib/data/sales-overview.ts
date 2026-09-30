import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReportRange, eachDate, samePeriodLastMonth } from "@/lib/domain/reports";
import { percentChange } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";

export interface SalesOverviewPoint {
  label: string;
  amount: number;
}

export interface SalesOverview {
  total: number;
  series: SalesOverviewPoint[];
  rangeLabel: string;
  /** Change against the same (day-count-matched) period last month. Null with nothing to compare against. */
  deltaPercent: number | null;
  deltaLabel: string;
}

interface SaleRow {
  sale_date: string;
  total_amount: number;
}

/**
 * One point per day this month. Week/Year used to be options here too, but
 * they duplicated /reports (which already covers any range with its own
 * picker) -- this panel now only ever shows the current month.
 */
function buildSeries(rows: SaleRow[], from: string, to: string): SalesOverviewPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.sale_date, (byDate.get(row.sale_date) ?? 0) + Number(row.total_amount));
  }
  return eachDate(from, to).map((date) => ({
    label: String(Number(date.slice(8, 10))),
    amount: byDate.get(date) ?? 0,
  }));
}

/**
 * Total sales and a chart series for the dashboard's Sales overview panel,
 * calendar-aligned to "This month" rather than the fixed 30-day window
 * getDashboardData uses elsewhere on the page -- a separate, cheap query
 * rather than widening that already-large fetch for one panel.
 */
export async function getSalesOverview(farmId: string, today: string): Promise<SalesOverview> {
  const supabase = await createSupabaseServerClient();
  const resolved = resolveReportRange("month", today);

  // Day-count-matched, not the full previous month -- 4 days into this
  // month against all 31 days of last month would always look like a
  // collapse. samePeriodLastMonth clamps day-of-month, so a month-to-date
  // comparison measures the same number of days on both sides.
  const comparisonRange = samePeriodLastMonth(resolved.from, resolved.to);
  const deltaLabel = "vs last month";

  const [current, previous] = await Promise.all([
    supabase
      .from("egg_sales")
      .select("sale_date, total_amount")
      .eq("farm_id", farmId)
      .gte("sale_date", resolved.from)
      .lte("sale_date", resolved.to),
    supabase
      .from("egg_sales")
      .select("total_amount")
      .eq("farm_id", farmId)
      .gte("sale_date", comparisonRange.from)
      .lte("sale_date", comparisonRange.to),
  ]);

  if (current.error) {
    logger.error("sales overview lookup failed", { reason: current.error.message });
    return { total: 0, series: [], rangeLabel: resolved.label, deltaPercent: null, deltaLabel };
  }
  if (previous.error) {
    logger.error("sales overview comparison lookup failed", { reason: previous.error.message });
  }

  const rows = (current.data ?? []) as SaleRow[];
  const total = rows.reduce((sum, row) => sum + Number(row.total_amount), 0);
  const previousTotal = (previous.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_amount),
    0
  );

  return {
    total,
    series: buildSeries(rows, resolved.from, resolved.to),
    rangeLabel: resolved.label,
    deltaPercent: previous.error ? null : percentChange(total, previousTotal),
    deltaLabel,
  };
}
