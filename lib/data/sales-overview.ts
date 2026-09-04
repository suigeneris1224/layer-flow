import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReportRange, eachDate, samePeriodLastMonth, sameRangeLastYear } from "@/lib/domain/reports";
import { percentChange } from "@/lib/domain/calculations";
import { logger } from "@/lib/observability/logger";

export type SalesOverviewRange = "month" | "year";

export interface SalesOverviewPoint {
  label: string;
  amount: number;
}

export interface SalesOverview {
  total: number;
  series: SalesOverviewPoint[];
  rangeLabel: string;
  /** Change against the same (day-count-matched) period last month/year. Null with nothing to compare against. */
  deltaPercent: number | null;
  deltaLabel: string;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface SaleRow {
  sale_date: string;
  total_amount: number;
}

/** One point per day this month, or one per month so far this year. */
function buildSeries(rows: SaleRow[], range: SalesOverviewRange, from: string, to: string): SalesOverviewPoint[] {
  if (range === "month") {
    const byDate = new Map<string, number>();
    for (const row of rows) {
      byDate.set(row.sale_date, (byDate.get(row.sale_date) ?? 0) + Number(row.total_amount));
    }
    return eachDate(from, to).map((date) => ({
      label: String(Number(date.slice(8, 10))),
      amount: byDate.get(date) ?? 0,
    }));
  }

  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const ym = row.sale_date.slice(0, 7);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + Number(row.total_amount));
  }

  const year = from.slice(0, 4);
  const startMonth = Number(from.slice(5, 7));
  const endMonth = Number(to.slice(5, 7));
  return Array.from({ length: endMonth - startMonth + 1 }, (_, index) => {
    const month = startMonth + index;
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    return { label: MONTH_SHORT[month - 1], amount: byMonth.get(ym) ?? 0 };
  });
}

/**
 * Total sales and a chart series for the dashboard's Sales overview panel,
 * calendar-aligned ("This month"/"This year") rather than the fixed 30-day
 * window getDashboardData uses elsewhere on the page -- a separate, cheap
 * query rather than widening that already-large fetch for one panel.
 */
export async function getSalesOverview(
  farmId: string,
  range: SalesOverviewRange,
  today: string
): Promise<SalesOverview> {
  const supabase = await createSupabaseServerClient();
  const resolved = resolveReportRange(range, today);

  // Day-count-matched, not the full previous period -- 4 days into this
  // month against all 31 days of last month would always look like a
  // collapse. samePeriodLastMonth/sameRangeLastYear both clamp day-of-month
  // the same way, so a month-to-date and a year-to-date comparison are each
  // measuring the same number of days on both sides.
  const comparisonRange =
    range === "month" ? samePeriodLastMonth(resolved.from, resolved.to) : sameRangeLastYear(resolved.from, resolved.to);
  const deltaLabel = range === "month" ? "vs last month" : "vs last year";

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
    series: buildSeries(rows, range, resolved.from, resolved.to),
    rangeLabel: resolved.label,
    deltaPercent: previous.error ? null : percentChange(total, previousTotal),
    deltaLabel,
  };
}
