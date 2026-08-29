import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import { canAccess } from "@/lib/subscriptions/entitlements";
import { getFlocks } from "@/lib/data/flocks";
import { layingRate, feedPerHen, flockAgeWeeks } from "@/lib/domain/calculations";
import { farmToday } from "@/lib/format";
import { logger } from "@/lib/observability/logger";
import { eachDate, type ResolvedRange } from "@/lib/domain/reports";

/**
 * Production-side insights: laying rate trend, egg-size mix, and (Pro)
 * per-flock comparison, over a farmer-chosen date range.
 *
 * Mirrors lib/data/dashboard.ts's query shapes, just widened from "today" /
 * "this week vs last week" to an arbitrary range.
 */

export interface LayingRatePoint {
  day: string;
  layingRate: number;
}

export interface SizeSlice {
  name: string;
  quantity: number;
  percentage: number;
}

export interface FlockComparisonRow {
  id: string;
  name: string;
  breed: string;
  ageWeeks: number;
  totalEggs: number;
  avgLayingRate: number;
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
    sizes: SizeSlice[];
  };
  /** Only populated when the farm's plan includes flock_comparison. */
  flockComparison: FlockComparisonRow[] | null;
}

interface SizeJoin {
  quantity: number;
  egg_sizes: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
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

  const [production, feed, sizes, flocks] = await Promise.all([
    supabase
      .from("daily_production")
      .select("production_date, hens_present, eggs_collected, mortality, flock_id")
      .eq("farm_id", context.farmId)
      .gte("production_date", range.from)
      .lte("production_date", range.to),
    supabase
      .from("feed_usage")
      .select("quantity_kg")
      .eq("farm_id", context.farmId)
      .gte("usage_date", range.from)
      .lte("usage_date", range.to),
    supabase
      .from("daily_egg_size_production")
      .select(
        "quantity, egg_sizes!inner(name, sort_order), daily_production!inner(farm_id, production_date)"
      )
      .eq("daily_production.farm_id", context.farmId)
      .gte("daily_production.production_date", range.from)
      .lte("daily_production.production_date", range.to),
    hasFlockComparison ? getFlocks(context.farmId) : Promise.resolve([]),
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

  const productionRows = production.data ?? [];

  const totalEggs = sum(productionRows, (row) => row.eggs_collected);
  const totalMortality = sum(productionRows, (row) => row.mortality);
  const totalHensDays = sum(productionRows, (row) => row.hens_present);
  const totalFeedKg = sum(feed.data ?? [], (row) => Number(row.quantity_kg));

  const layingRateSeries = buildLayingRateSeries(productionRows, range);

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
      sizes: buildSizeSlices(sizes.data ?? []),
    },
    flockComparison: hasFlockComparison
      ? buildFlockComparison(flocks, productionRows, today)
      : null,
  };
});

function buildLayingRateSeries(
  rows: readonly { production_date: string; eggs_collected: number; hens_present: number }[],
  range: ResolvedRange
): LayingRatePoint[] {
  const byDate = new Map<string, { eggs: number; hens: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.production_date) ?? { eggs: 0, hens: 0 };
    entry.eggs += row.eggs_collected;
    entry.hens += row.hens_present;
    byDate.set(row.production_date, entry);
  }

  return eachDate(range.from, range.to).map((date) => {
    const entry = byDate.get(date);
    return {
      day: date.slice(5),
      layingRate: entry ? layingRate(entry.eggs, entry.hens) : 0,
    };
  });
}

function buildSizeSlices(rows: readonly unknown[]): SizeSlice[] {
  const slices = (rows as SizeJoin[]).map((row) => {
    const size = one(row.egg_sizes);
    return {
      name: size?.name ?? "Unknown",
      sortOrder: size?.sort_order ?? 0,
      quantity: Number(row.quantity) || 0,
    };
  });

  const total = slices.reduce((running, slice) => running + slice.quantity, 0);

  return slices
    .filter((slice) => slice.quantity > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((slice) => ({
      name: slice.name,
      quantity: slice.quantity,
      percentage: total > 0 ? Math.round((slice.quantity / total) * 1000) / 10 : 0,
    }));
}

function buildFlockComparison(
  flocks: Awaited<ReturnType<typeof getFlocks>>,
  productionRows: readonly {
    flock_id: string;
    eggs_collected: number;
    hens_present: number;
  }[],
  today: string
): FlockComparisonRow[] {
  return flocks
    .filter((flock) => flock.status === "GROWING" || flock.status === "PRODUCING")
    .map((flock) => {
      const rows = productionRows.filter((row) => row.flock_id === flock.id);
      const eggs = sum(rows, (row) => row.eggs_collected);
      const hens = sum(rows, (row) => row.hens_present);

      return {
        id: flock.id,
        name: flock.name,
        breed: flock.breed,
        ageWeeks: flockAgeWeeks(flock.placementDate, new Date(`${today}T00:00:00Z`)),
        totalEggs: eggs,
        avgLayingRate: layingRate(eggs, hens),
      };
    })
    .sort((a, b) => b.avgLayingRate - a.avgLayingRate);
}
