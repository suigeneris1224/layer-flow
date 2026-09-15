import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import { canAccess } from "@/lib/subscriptions/entitlements";
import { getFlocks } from "@/lib/data/flocks";
import { attributeFlockProfitability } from "@/lib/domain/profitability";
import {
  costPerEgg,
  feedConversionRatio,
  layingRate,
  feedPerHen,
  flockAgeWeeks,
} from "@/lib/domain/calculations";
import { farmToday, weekdayShort } from "@/lib/format";
import { logger } from "@/lib/observability/logger";
import {
  comparisonWindow,
  eachDate,
  type ComparisonWindow,
  type ResolvedRange,
} from "@/lib/domain/reports";

/**
 * Production-side insights: laying rate trend, egg-size mix (Pro), and (Pro)
 * per-flock comparison, over a farmer-chosen date range.
 *
 * Mirrors lib/data/dashboard.ts's query shapes, just widened from "today" /
 * "this week vs last week" to an arbitrary range.
 */

export interface LayingRatePoint {
  day: string;
  layingRate: number;
  /** Same date one comparison period back (see lib/domain/reports.ts's comparisonWindow). 0 when there's no data that far back. */
  previous: number;
}

export interface SizeSlice {
  name: string;
  quantity: number;
  percentage: number;
}

/** One point per day; one numeric field per size name (percentage of that day's total). */
export interface SizeTrendPoint {
  day: string;
  [size: string]: string | number;
}

export interface FlockComparisonRow {
  id: string;
  name: string;
  breed: string;
  ageWeeks: number;
  totalEggs: number;
  avgLayingRate: number;
  /** Operating cost attributed to this flock, divided by its eggs. 0 when there's no cost or egg data. */
  costPerEgg: number;
  /** Kilograms of feed per egg -- feed efficiency, independent of feed price. 0 when there's no feed or egg data. */
  feedConversion: number;
}

export interface AnalyticsData {
  range: ResolvedRange;
  totals: {
    totalEggs: number;
    totalMortality: number;
    avgLayingRate: number;
    avgFeedPerHen: number;
  };
  charts: {
    layingRate: LayingRatePoint[];
    /** e.g. "Last week", "Last month" -- what the laying rate chart's "previous" series is compared against. */
    layingRateComparisonLabel: string;
    /** Only populated when the farm's plan includes egg_size_analytics. */
    sizes: SizeSlice[] | null;
    /** Same gate as `sizes` -- the size names present in `points`, in display order. */
    sizeTrend: { points: SizeTrendPoint[]; sizes: string[] } | null;
  };
  /** Only populated when the farm's plan includes flock_comparison. */
  flockComparison: FlockComparisonRow[] | null;
}

interface SizeJoin {
  quantity: number;
  egg_sizes: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null;
  daily_production?:
    | { production_date: string }
    | { production_date: string }[]
    | null;
}

type SaleRow = { total_amount: number; flock_id: string | null };
type ExpenseRow = { amount: number; category: string; flock_id: string | null };
type FeedRow = { quantity_kg: number; total_cost: number; flock_id: string | null };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function sum<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

export const getAnalyticsData = cache(async function getAnalyticsData(
  context: FarmContext,
  range: ResolvedRange
): Promise<AnalyticsData> {
  const supabase = await createSupabaseServerClient();
  const today = farmToday(context.timezone);

  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const hasFlockComparison = canAccess(entitlement, "flock_comparison");
  const hasSizeAnalytics = canAccess(entitlement, "egg_size_analytics");

  const comparison = comparisonWindow(range);
  // Widened to also cover the laying rate chart's comparison period -- always
  // <= range.from, so this one query covers both without a second round trip.
  const productionQueryFrom = comparison.shift(range.from);

  const [production, feed, sizes, flocks, sales, expenses] = await Promise.all([
    supabase
      .from("daily_production")
      .select("production_date, hens_present, eggs_collected, mortality, flock_id")
      .eq("farm_id", context.farmId)
      .gte("production_date", productionQueryFrom)
      .lte("production_date", range.to),
    // flock_id/total_cost are only needed for flock comparison's cost-per-egg
    // and feed-conversion columns, but this is the same table/date range the
    // farm-wide feed total already needs -- one query either way.
    supabase
      .from("feed_usage")
      .select("quantity_kg, total_cost, flock_id")
      .eq("farm_id", context.farmId)
      .gte("usage_date", range.from)
      .lte("usage_date", range.to),
    hasSizeAnalytics
      ? supabase
          .from("daily_egg_size_production")
          .select(
            "quantity, egg_sizes!inner(name, sort_order), daily_production!inner(farm_id, production_date)"
          )
          .eq("daily_production.farm_id", context.farmId)
          .gte("daily_production.production_date", range.from)
          .lte("daily_production.production_date", range.to)
      : Promise.resolve({ data: [], error: null }),
    hasFlockComparison ? getFlocks(context.farmId) : Promise.resolve([]),
    // Cost-per-egg needs revenue/cost attribution (attributeFlockProfitability),
    // which needs sales and expenses -- /analytics never queried these before
    // since that was /reports' job. Gated the same as the rest of this section.
    hasFlockComparison
      ? supabase
          .from("egg_sales")
          .select("total_amount, flock_id")
          .eq("farm_id", context.farmId)
          .gte("sale_date", range.from)
          .lte("sale_date", range.to)
      : Promise.resolve({ data: [] as SaleRow[], error: null }),
    hasFlockComparison
      ? supabase
          .from("expenses")
          .select("amount, category, flock_id")
          .eq("farm_id", context.farmId)
          .gte("expense_date", range.from)
          .lte("expense_date", range.to)
      : Promise.resolve({ data: [] as ExpenseRow[], error: null }),
  ]);

  if (production.error) {
    logger.error("analytics production lookup failed", { reason: production.error.message });
  }
  if (feed.error) {
    logger.error("analytics feed lookup failed", { reason: feed.error.message });
  }
  if (sizes.error) {
    logger.error("analytics size lookup failed", { reason: sizes.error.message });
  }
  if (sales.error) logger.error("analytics sales lookup failed", { reason: sales.error.message });
  if (expenses.error) {
    logger.error("analytics expenses lookup failed", { reason: expenses.error.message });
  }

  const productionRows = production.data ?? [];
  // The query above was widened to also pull in the comparison period's rows
  // (see productionQueryFrom) -- everything except the laying rate chart
  // itself must stay scoped to the range actually being reported on.
  const currentRangeRows = productionRows.filter((row) => row.production_date >= range.from);
  const feedRows = (feed.data ?? []) as FeedRow[];

  const totalEggs = sum(currentRangeRows, (row) => row.eggs_collected);
  const totalMortality = sum(currentRangeRows, (row) => row.mortality);
  const totalHensDays = sum(currentRangeRows, (row) => row.hens_present);
  const totalFeedKg = sum(feedRows, (row) => Number(row.quantity_kg));

  const layingRateSeries = buildLayingRateSeries(productionRows, range, comparison);
  const sizeRows = sizes.data ?? [];

  return {
    range,
    totals: {
      totalEggs,
      totalMortality,
      avgLayingRate: layingRate(totalEggs, totalHensDays),
      avgFeedPerHen: feedPerHen(totalFeedKg, totalHensDays),
    },
    charts: {
      layingRate: layingRateSeries,
      layingRateComparisonLabel: comparison.label,
      sizes: hasSizeAnalytics ? buildSizeSlices(sizeRows) : null,
      sizeTrend: hasSizeAnalytics ? buildSizeTrend(sizeRows, range) : null,
    },
    flockComparison: hasFlockComparison
      ? buildFlockComparison(
          flocks,
          currentRangeRows,
          feedRows,
          (sales.data ?? []) as SaleRow[],
          (expenses.data ?? []) as ExpenseRow[],
          today
        )
      : null,
  };
});

export function buildLayingRateSeries(
  rows: readonly { production_date: string; eggs_collected: number; hens_present: number }[],
  range: ResolvedRange,
  comparison: ComparisonWindow = comparisonWindow(range)
): LayingRatePoint[] {
  const byDate = new Map<string, { eggs: number; hens: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.production_date) ?? { eggs: 0, hens: 0 };
    entry.eggs += row.eggs_collected;
    entry.hens += row.hens_present;
    byDate.set(row.production_date, entry);
  }

  const rate = (entry: { eggs: number; hens: number } | undefined) =>
    entry ? layingRate(entry.eggs, entry.hens) : 0;

  return eachDate(range.from, range.to).map((date) => ({
    day: range.value === "week" ? weekdayShort(date) : date.slice(5),
    layingRate: rate(byDate.get(date)),
    previous: rate(byDate.get(comparison.shift(date))),
  }));
}

/**
 * One row per (day, size) comes in from the query above -- a multi-day range
 * needs these summed by size name before they're slices, or a year-long
 * range renders hundreds of near-duplicate rows instead of one per size.
 * Same Map-based reduction as buildLayingRateSeries above, keyed by name
 * instead of date.
 */
export function buildSizeSlices(rows: readonly unknown[]): SizeSlice[] {
  const byName = new Map<string, { sortOrder: number; quantity: number }>();

  for (const row of rows as SizeJoin[]) {
    const size = one(row.egg_sizes);
    const name = size?.name ?? "Unknown";
    const entry = byName.get(name) ?? { sortOrder: size?.sort_order ?? 0, quantity: 0 };
    entry.quantity += Number(row.quantity) || 0;
    byName.set(name, entry);
  }

  const total = [...byName.values()].reduce((running, entry) => running + entry.quantity, 0);

  return [...byName.entries()]
    .filter(([, entry]) => entry.quantity > 0)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([name, entry]) => ({
      name,
      quantity: entry.quantity,
      percentage: total > 0 ? Math.round((entry.quantity / total) * 1000) / 10 : 0,
    }));
}

/**
 * Same rows as buildSizeSlices, kept per-day instead of collapsed across the
 * whole range -- the egg-size donut answers "what's the mix," this answers
 * "how has the mix moved," which is the actual "advanced" half of the pair.
 */
export function buildSizeTrend(
  rows: readonly unknown[],
  range: ResolvedRange
): { points: SizeTrendPoint[]; sizes: string[] } {
  const sortOrderByName = new Map<string, number>();
  const byDate = new Map<string, Map<string, number>>();

  for (const row of rows as SizeJoin[]) {
    const size = one(row.egg_sizes);
    const production = one(row.daily_production);
    if (!size || !production) continue;

    sortOrderByName.set(size.name, size.sort_order);

    const dayEntry = byDate.get(production.production_date) ?? new Map<string, number>();
    dayEntry.set(size.name, (dayEntry.get(size.name) ?? 0) + (Number(row.quantity) || 0));
    byDate.set(production.production_date, dayEntry);
  }

  const sizeNames = [...sortOrderByName.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);

  const points = eachDate(range.from, range.to).map((date) => {
    const dayEntry = byDate.get(date);
    const total = dayEntry ? [...dayEntry.values()].reduce((s, v) => s + v, 0) : 0;

    const point: SizeTrendPoint = { day: date.slice(5) };
    for (const name of sizeNames) {
      const quantity = dayEntry?.get(name) ?? 0;
      point[name] = total > 0 ? Math.round((quantity / total) * 1000) / 10 : 0;
    }
    return point;
  });

  return { points, sizes: sizeNames };
}

function buildFlockComparison(
  flocks: Awaited<ReturnType<typeof getFlocks>>,
  productionRows: readonly {
    flock_id: string;
    eggs_collected: number;
    hens_present: number;
  }[],
  feedRows: readonly FeedRow[],
  sales: readonly SaleRow[],
  expenses: readonly ExpenseRow[],
  today: string
): FlockComparisonRow[] {
  const activeFlocks = flocks.filter(
    (flock) => flock.status === "GROWING" || flock.status === "PRODUCING"
  );

  const feedKgByFlock = new Map<string, number>();
  for (const row of feedRows) {
    if (!row.flock_id) continue;
    feedKgByFlock.set(row.flock_id, (feedKgByFlock.get(row.flock_id) ?? 0) + Number(row.quantity_kg));
  }

  const profitByFlock = new Map(
    attributeFlockProfitability(
      activeFlocks,
      sales,
      expenses,
      feedRows
        .filter((row): row is FeedRow & { flock_id: string } => row.flock_id !== null)
        .map((row) => ({ total_cost: Number(row.total_cost), flock_id: row.flock_id })),
      false
    ).map((row) => [row.id, row.cost])
  );

  return activeFlocks
    .map((flock) => {
      const rows = productionRows.filter((row) => row.flock_id === flock.id);
      const eggs = sum(rows, (row) => row.eggs_collected);
      const hens = sum(rows, (row) => row.hens_present);
      const cost = profitByFlock.get(flock.id) ?? 0;
      const feedKg = feedKgByFlock.get(flock.id) ?? 0;

      return {
        id: flock.id,
        name: flock.name,
        breed: flock.breed,
        ageWeeks: flockAgeWeeks(flock.placementDate, new Date(`${today}T00:00:00Z`)),
        totalEggs: eggs,
        avgLayingRate: layingRate(eggs, hens),
        costPerEgg: costPerEgg(cost, eggs),
        feedConversion: feedConversionRatio(feedKg, eggs),
      };
    })
    .sort((a, b) => b.avgLayingRate - a.avgLayingRate);
}
