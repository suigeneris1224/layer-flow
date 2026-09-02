import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import { canAccess } from "@/lib/subscriptions/entitlements";
import {
  feedPerHen,
  layingRate,
  operatingCostsFromExpenses,
  operatingProfit,
  percentChange,
  roundMoney,
  sellableEggs,
} from "@/lib/domain/calculations";
import {
  daysBetween,
  eggSizeAlert,
  feedCostAlert,
  flockLossAlert,
  lowInventoryAlert,
  mortalityAlert,
  productionAlert,
  resolveThresholds,
  stalePricingAlert,
  summariseAlerts,
  underperformingFlockAlert,
  vaccinationAlert,
  type Alert,
  type PricedSizeStatus,
  type ProductionPoint,
  type ResolvedThresholds,
} from "@/lib/domain/alerts";
import { attributeFlockProfitability } from "@/lib/domain/profitability";
import { summariseInventory, type InventoryLine } from "@/lib/domain/inventory";
import { describeActivity, flockStatusLine, type FlockStatus } from "@/lib/domain/presentation";
import {
  INVENTORY_BALANCE_COLUMNS,
  toInventoryRows,
  type InventoryBalanceRow,
} from "@/lib/data/inventory";
import { getLatestVaccinationByFlock } from "@/lib/data/health";
import { syncNotifications } from "@/lib/data/notifications";
import { getAlertThresholdOverrides } from "@/lib/data/alert-thresholds";
import { getCurrentPrices } from "@/lib/data/pricing";
import { farmToday, shiftDate } from "@/lib/format";
import { logger } from "@/lib/observability/logger";

export type { InventoryLine };

/** Days of history pulled for trends, deltas and the sales chart. */
const WINDOW_DAYS = 30;
const RECENT_ACTIVITY_LIMIT = 5;

export interface SeriesPoint {
  day: string;
  thisWeek: number;
  lastWeek: number;
}

export interface SizeSlice {
  name: string;
  quantity: number;
  percentage: number;
}

export interface ActivityEntry {
  id: string;
  title: string;
  detail: string;
  at: string;
}

export interface ActiveFlockSummary {
  id: string;
  name: string;
  breed: string;
  houseName: string;
  currentHens: number;
  eggsToday: number;
  layingRateToday: number;
  status: string;
}

export interface DashboardData {
  date: string;
  today: {
    eggs: number;
    hens: number;
    layingRate: number;
    feedKg: number;
    feedPerHen: number;
    sellableEggs: number;
    mortality: number;
    hasRecord: boolean;
  };
  inventory: {
    lines: InventoryLine[];
    totalEggs: number;
    /** Sum of per-size trays, not floor(totalEggs / 30). */
    totalTrays: number;
    looseEggs: number;
    /** True when any size has gone below zero, which the UI must show. */
    hasNegative: boolean;
    /**
     * Collected but not yet sorted into a size. These are real eggs in the
     * shed that inventory does not count, so the UI must say so rather than
     * let the farmer think they went missing.
     */
    ungradedEggs: number;
  };
  /** Period-over-period change for the KPI row. Null when there is no basis. */
  deltas: {
    eggs: number | null;
    revenue: number | null;
    expenses: number | null;
    profit: number | null;
  };
  money: {
    revenue: number;
    operatingCosts: number;
    estimatedProfit: number;
    /** False on Free, where sales are not tracked, so profit is partial. */
    isComplete: boolean;
  };
  charts: {
    production: SeriesPoint[];
    sizesToday: SizeSlice[];
    sales: { day: string; amount: number }[];
  };
  flocks: ActiveFlockSummary[];
  flockStatus: FlockStatus;
  activity: ActivityEntry[];
  alerts: Alert[];
}

interface FlockJoin {
  id: string;
  name: string;
  breed: string;
  current_hens: number;
  status: string;
  placement_date: string;
  houses: { name: string } | { name: string }[];
}

interface SizeProductionRow {
  quantity: number;
  egg_sizes: { name: string; sort_order: number } | { name: string; sort_order: number }[];
  daily_production: { production_date: string } | { production_date: string }[];
}

/** Postgrest returns a to-one join as an object or a single-element array. */
function oneOf<T>(value: T | T[] | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Everything the dashboard renders, in one pass.
 *
 * All queries fire together rather than in sequence. On a rural mobile
 * connection six serial round trips is the difference between a dashboard
 * that feels instant and one that feels broken.
 *
 * Memoised per request with React `cache`: the top bar's alert badge and the
 * dashboard page both need this data, and without the memo a single render of
 * /dashboard would run every query twice.
 */
export const getDashboardData = cache(async function getDashboardData(
  context: FarmContext
): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const today = farmToday(context.timezone);
  const yesterday = shiftDate(today, -1);
  const windowStart = shiftDate(today, -WINDOW_DAYS);

  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const hasSales = canAccess(entitlement, "egg_sales");
  /*
   * Alerts are a Starter feature on the pricing table and were shipping to
   * Free farms because nothing ever asked. An empty list is the right shape for
   * "not on this plan": TodayStatus renders nothing rather than an upsell
   * shouting at somebody every morning, and the topbar badge falls to zero.
   */
  const hasAlerts = canAccess(entitlement, "alerts");
  /*
   * advanced_alerts (Pro) layers configurable thresholds and four extra rules
   * on top of the base `alerts` pipeline -- it never runs on its own without
   * `alerts` also being true, since a farm not entitled to alerts at all gets
   * an empty alert list regardless.
   */
  const hasAdvancedAlerts = hasAlerts && canAccess(entitlement, "advanced_alerts");

  const [
    production,
    feed,
    inventory,
    sales,
    expenses,
    flocks,
    grading,
    sizeProduction,
    activity,
    latestVaccinationByFlock,
    thresholdOverrides,
    prices,
  ] = await Promise.all([
    supabase
      .from("daily_production")
      .select(
        "production_date, hens_present, eggs_collected, broken_eggs, dirty_eggs, mortality, flock_id"
      )
      .eq("farm_id", context.farmId)
      .gte("production_date", windowStart)
      .lte("production_date", today),
    supabase
      .from("feed_usage")
      .select("usage_date, quantity_kg, total_cost, flock_id")
      .eq("farm_id", context.farmId)
      .gte("usage_date", windowStart)
      .lte("usage_date", today),
    supabase
      .from("egg_inventory_balances")
      .select(INVENTORY_BALANCE_COLUMNS)
      .eq("farm_id", context.farmId)
      .order("sort_order"),
    hasSales
      ? supabase
          .from("egg_sales")
          .select("sale_date, total_amount, flock_id")
          .eq("farm_id", context.farmId)
          .gte("sale_date", windowStart)
          .lte("sale_date", today)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("expenses")
      .select("expense_date, amount, category, flock_id")
      .eq("farm_id", context.farmId)
      .gte("expense_date", windowStart)
      .lte("expense_date", today),
    supabase
      .from("flocks")
      .select("id, name, breed, current_hens, status, placement_date, houses!inner(name)")
      .eq("farm_id", context.farmId)
      .in("status", ["GROWING", "PRODUCING"])
      .order("name"),
    supabase
      .from("egg_grading_summary")
      .select("eggs_ungraded")
      .eq("farm_id", context.farmId)
      .maybeSingle(),
    /*
     * A window, not just today: the egg-size-shift alert (advanced_alerts)
     * needs a baseline to compare today against, same shape as the
     * production/feed windows above. `sizesToday` in the chart below still
     * filters this down to today only.
     */
    supabase
      .from("daily_egg_size_production")
      .select(
        "quantity, egg_sizes!inner(name, sort_order), daily_production!inner(farm_id, production_date)"
      )
      .eq("daily_production.farm_id", context.farmId)
      .gte("daily_production.production_date", windowStart)
      .lte("daily_production.production_date", today),
    supabase
      .from("audit_logs")
      .select("id, action, metadata, created_at")
      .eq("farm_id", context.farmId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    getLatestVaccinationByFlock(context.farmId),
    hasAdvancedAlerts ? getAlertThresholdOverrides(context.farmId) : Promise.resolve(null),
    hasAdvancedAlerts ? getCurrentPrices(context.farmId, today) : Promise.resolve([]),
  ]);

  logFailures({
    production, feed, inventory, sales, expenses, flocks, grading, sizeProduction, activity,
  });

  const productionRows = production.data ?? [];
  const feedRows = feed.data ?? [];
  const salesRows = (sales.data ?? []) as {
    sale_date: string;
    total_amount: number;
    flock_id: string | null;
  }[];
  const expenseRows = (expenses.data ?? []) as {
    expense_date: string;
    amount: number;
    category: string;
    flock_id: string | null;
  }[];
  const sizeProductionRows = (sizeProduction.data ?? []) as unknown as SizeProductionRow[];

  const todayProduction = productionRows.filter((row) => row.production_date === today);
  const yesterdayProduction = productionRows.filter((row) => row.production_date === yesterday);
  const todayFeed = feedRows.filter((row) => row.usage_date === today);

  const eggs = sum(todayProduction, (row) => row.eggs_collected);
  const eggsYesterday = sum(yesterdayProduction, (row) => row.eggs_collected);
  const hensReported = sum(todayProduction, (row) => row.hens_present);
  const broken = sum(todayProduction, (row) => row.broken_eggs);
  const dirty = sum(todayProduction, (row) => row.dirty_eggs);
  const mortality = sum(todayProduction, (row) => row.mortality);
  const feedKg = sum(todayFeed, (row) => Number(row.quantity_kg));
  const feedCostToday = sum(todayFeed, (row) => Number(row.total_cost));

  // Hens present is only known on days with a record. Before the farmer
  // records, fall back to the flock roster so the tile is never blank.
  const flockRows = (flocks.data ?? []) as unknown as FlockJoin[];
  const hensOnFarm =
    hensReported > 0
      ? hensReported
      : flockRows.reduce((total, flock) => total + flock.current_hens, 0);

  const revenue = roundMoney(
    sum(salesRows.filter((row) => row.sale_date === today), (row) => Number(row.total_amount))
  );
  const revenueYesterday = roundMoney(
    sum(salesRows.filter((row) => row.sale_date === yesterday), (row) => Number(row.total_amount))
  );

  const operatingCosts = operatingCostsFromExpenses(
    feedCostToday,
    expenseRows.filter((row) => row.expense_date === today)
  );
  const costsYesterday = operatingCostsFromExpenses(
    sum(feedRows.filter((row) => row.usage_date === yesterday), (row) => Number(row.total_cost)),
    expenseRows.filter((row) => row.expense_date === yesterday)
  );

  const profit = operatingProfit(revenue, operatingCosts);
  const profitYesterday = operatingProfit(revenueYesterday, costsYesterday);

  // Mortality over the trailing week, which is what the flock card reports on.
  const weekStart = shiftDate(today, -6);
  const deathsThisWeek = sum(
    productionRows.filter((row) => row.production_date >= weekStart),
    (row) => row.mortality
  );

  const inventorySummary = buildInventory(
    inventory.data ?? [],
    Number(grading.data?.eggs_ungraded ?? 0)
  );

  const thresholds = resolveThresholds(thresholdOverrides, hasAdvancedAlerts);

  const alerts = hasAlerts
    ? buildAlerts({
        productionRows,
        feedRows,
        salesRows,
        expenseRows,
        sizeProductionRows,
        prices,
        today,
        weekStart,
        mortalityToday: mortality,
        hens: hensOnFarm,
        flockRows,
        latestVaccinationByFlock,
        totalTrays: inventorySummary.totalTrays,
        thresholds,
        hasAdvancedAlerts,
      })
    : [];

  /*
   * Awaited, not fire-and-forget: the topbar reads getNotifications /
   * getUnreadNotificationCount in the same request, right after this call, and
   * they must see today's sync rather than last navigation's. A failure here
   * must not break the dashboard render, so it is caught and logged instead
   * of thrown.
   */
  try {
    await syncNotifications(context, alerts);
  } catch (error) {
    logger.error("notification sync failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    date: today,
    today: {
      eggs,
      hens: hensOnFarm,
      layingRate: layingRate(eggs, hensReported),
      feedKg,
      feedPerHen: feedPerHen(feedKg, hensReported),
      sellableEggs: sellableEggs(eggs, broken, dirty),
      mortality,
      hasRecord: todayProduction.length > 0,
    },
    deltas: {
      eggs: percentChange(eggs, eggsYesterday),
      revenue: percentChange(revenue, revenueYesterday),
      expenses: percentChange(operatingCosts, costsYesterday),
      profit: percentChange(profit, profitYesterday),
    },
    inventory: inventorySummary,
    money: {
      revenue,
      operatingCosts,
      estimatedProfit: profit,
      isComplete: hasSales,
    },
    charts: {
      production: buildProductionSeries(productionRows, today),
      sizesToday: buildSizeSlices(
        sizeProductionRows.filter((row) => oneOf(row.daily_production)?.production_date === today)
      ),
      sales: buildSalesSeries(salesRows, today),
    },
    flocks: buildFlockSummaries(flockRows, todayProduction),
    flockStatus: flockStatusLine(deathsThisWeek, hensOnFarm),
    activity: buildActivity(activity.data ?? []),
    alerts,
  };
});

function logFailures(results: Record<string, { error?: { message: string } | null }>) {
  for (const [label, result] of Object.entries(results)) {
    if (result.error) {
      logger.error("dashboard query failed", { label, reason: result.error.message });
    }
  }
}

function sum<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

/**
 * Shape the balances view into the summary both this dashboard and the
 * inventory screen render.
 *
 * The tray maths and the treatment of negative balances live in
 * `lib/domain/inventory.ts` so the two screens cannot disagree -- and so they
 * stay covered by unit tests rather than being re-derived here.
 */
function buildInventory(
  rows: readonly InventoryBalanceRow[],
  ungradedEggs: number
): DashboardData["inventory"] {
  const summary = summariseInventory(toInventoryRows(rows));

  return {
    lines: summary.lines,
    totalEggs: summary.totalEggs,
    totalTrays: summary.totalTrays,
    looseEggs: summary.looseEggs,
    hasNegative: summary.hasNegative,
    ungradedEggs: Math.max(0, ungradedEggs),
  };
}

function buildFlockSummaries(
  flocks: readonly FlockJoin[],
  todayProduction: readonly {
    flock_id: string;
    eggs_collected: number;
    hens_present: number;
  }[]
): ActiveFlockSummary[] {
  return flocks.map((flock) => {
    const record = todayProduction.find((row) => row.flock_id === flock.id);
    const house = Array.isArray(flock.houses) ? flock.houses[0] : flock.houses;

    return {
      id: flock.id,
      name: flock.name,
      breed: flock.breed,
      houseName: house?.name ?? "",
      currentHens: flock.current_hens,
      eggsToday: record?.eggs_collected ?? 0,
      layingRateToday: record ? layingRate(record.eggs_collected, record.hens_present) : 0,
      status: flock.status,
    };
  });
}

/**
 * Per-size share of the day's collection against a baseline share over the
 * rest of the window, for the (advanced_alerts) egg-size-shift rule.
 */
function buildEggSizeShiftCandidates(
  rows: readonly SizeProductionRow[],
  today: string
): { name: string; todayShare: number; baselineShare: number }[] {
  const byDateByName = new Map<string, Map<string, number>>();
  const totalByDate = new Map<string, number>();
  const names = new Set<string>();

  for (const row of rows) {
    const size = oneOf(row.egg_sizes);
    const production = oneOf(row.daily_production);
    if (!size || !production) continue;

    const date = production.production_date;
    const quantity = Number(row.quantity) || 0;
    names.add(size.name);

    const dayMap = byDateByName.get(date) ?? new Map<string, number>();
    dayMap.set(size.name, (dayMap.get(size.name) ?? 0) + quantity);
    byDateByName.set(date, dayMap);
    totalByDate.set(date, (totalByDate.get(date) ?? 0) + quantity);
  }

  const todayTotal = totalByDate.get(today) ?? 0;
  const baselineDates = [...totalByDate.keys()].filter(
    (date) => date !== today && (totalByDate.get(date) ?? 0) > 0
  );

  return [...names].map((name) => {
    const todayQty = byDateByName.get(today)?.get(name) ?? 0;
    const todayShare = todayTotal > 0 ? (todayQty / todayTotal) * 100 : 0;

    if (baselineDates.length === 0) {
      return { name, todayShare, baselineShare: todayShare };
    }

    const baselineShare =
      baselineDates.reduce((sumShare, date) => {
        const dayTotal = totalByDate.get(date) ?? 0;
        const qty = byDateByName.get(date)?.get(name) ?? 0;
        return sumShare + (dayTotal > 0 ? (qty / dayTotal) * 100 : 0);
      }, 0) / baselineDates.length;

    return { name, todayShare, baselineShare };
  });
}

interface BuildAlertsInput {
  productionRows: readonly {
    production_date: string;
    eggs_collected: number;
    hens_present: number;
    flock_id: string;
  }[];
  feedRows: readonly { usage_date: string; total_cost: number; flock_id: string }[];
  salesRows: readonly { sale_date: string; total_amount: number; flock_id: string | null }[];
  expenseRows: readonly {
    expense_date: string;
    amount: number;
    category: string;
    flock_id: string | null;
  }[];
  sizeProductionRows: readonly SizeProductionRow[];
  prices: readonly { name: string; currentPrice: { effectiveFrom: string } | null }[];
  today: string;
  weekStart: string;
  mortalityToday: number;
  hens: number;
  flockRows: readonly FlockJoin[];
  latestVaccinationByFlock: ReadonlyMap<string, string>;
  totalTrays: number;
  thresholds: ResolvedThresholds;
  hasAdvancedAlerts: boolean;
}

function buildAlerts(input: BuildAlertsInput): Alert[] {
  const {
    productionRows,
    feedRows,
    salesRows,
    expenseRows,
    sizeProductionRows,
    prices,
    today,
    weekStart,
    mortalityToday,
    hens,
    flockRows,
    latestVaccinationByFlock,
    totalTrays,
    thresholds,
    hasAdvancedAlerts,
  } = input;

  const eggsByDate = new Map<string, number>();
  for (const row of productionRows) {
    const current = eggsByDate.get(row.production_date) ?? 0;
    eggsByDate.set(row.production_date, current + row.eggs_collected);
  }

  const points: ProductionPoint[] = [...eggsByDate.entries()]
    .map(([date, eggs]) => ({ date, eggs }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const feedToday = sum(
    feedRows.filter((row) => row.usage_date === today),
    (row) => Number(row.total_cost)
  );
  const earlierFeed = feedRows.filter((row) => row.usage_date !== today);
  const feedBaseline =
    earlierFeed.length > 0
      ? sum(earlierFeed, (row) => Number(row.total_cost)) / earlierFeed.length
      : 0;

  /*
   * At most one flock's gap is surfaced here, even when several are overdue --
   * the notification this feeds has one open row per alert type, and a farmer
   * acting on the nearest one will re-check the others anyway. TodayStatus
   * (which does not persist) is unaffected by this narrowing. The same
   * narrowing applies below to every other per-entity rule the advanced tier
   * adds.
   */
  const overdueVaccination = flockRows
    .map((flock) =>
      vaccinationAlert(
        {
          flockName: flock.name,
          lastVaccinationDate: latestVaccinationByFlock.get(flock.id) ?? null,
          placementDate: flock.placement_date,
        },
        new Date(),
        thresholds.vaccinationGapDays
      )
    )
    .find((alert): alert is Alert => alert !== null);

  const alerts: (Alert | null)[] = [
    productionAlert(points, thresholds.productionDrop),
    feedCostAlert(feedToday, feedBaseline, thresholds.feedCostRise),
    mortalityAlert(mortalityToday, hens, thresholds.dailyMortalityRate),
    overdueVaccination ?? null,
  ];

  if (hasAdvancedAlerts) {
    // Egg-size shift: pick the size whose share moved the most.
    const shiftCandidates = buildEggSizeShiftCandidates(sizeProductionRows, today);
    const worstShift = shiftCandidates.reduce<
      { name: string; todayShare: number; baselineShare: number; shift: number } | null
    >((worst, candidate) => {
      const shift = Math.abs(candidate.todayShare - candidate.baselineShare);
      if (!worst || shift > worst.shift) return { ...candidate, shift };
      return worst;
    }, null);
    alerts.push(
      worstShift
        ? eggSizeAlert(
            worstShift.name,
            worstShift.todayShare,
            worstShift.baselineShare,
            thresholds.eggSizeShift
          )
        : null
    );

    // Low inventory: a single farm-wide figure, no narrowing needed.
    alerts.push(lowInventoryAlert(totalTrays, thresholds.lowInventoryTrays));

    // Underperforming flock: pick the single lowest laying rate this week.
    const weekProduction = productionRows.filter((row) => row.production_date >= weekStart);
    const flockPerformance = flockRows
      .map((flock) => {
        const rows = weekProduction.filter((row) => row.flock_id === flock.id);
        const eggsSum = sum(rows, (row) => row.eggs_collected);
        const hensSum = sum(rows, (row) => row.hens_present);
        return { name: flock.name, layingRate: layingRate(eggsSum, hensSum) };
      })
      .filter((entry) => entry.layingRate > 0);

    const farmAvgLayingRate =
      flockPerformance.length > 0
        ? flockPerformance.reduce((total, entry) => total + entry.layingRate, 0) /
          flockPerformance.length
        : 0;

    const worstPerformer = flockPerformance.reduce<{ name: string; layingRate: number } | null>(
      (worst, entry) => (!worst || entry.layingRate < worst.layingRate ? entry : worst),
      null
    );
    alerts.push(
      worstPerformer
        ? underperformingFlockAlert(worstPerformer, farmAvgLayingRate, thresholds.underperformancePct)
        : null
    );

    // Flock losing money: pick the single worst weekly loss.
    const weekSales = salesRows.filter((row) => row.sale_date >= weekStart);
    const weekExpenses = expenseRows.filter((row) => row.expense_date >= weekStart);
    const weekFeed = feedRows.filter((row) => row.usage_date >= weekStart);
    const flockProfit = attributeFlockProfitability(
      flockRows.map((flock) => ({ id: flock.id, name: flock.name })),
      weekSales,
      weekExpenses,
      weekFeed,
      false
    );
    const worstLoss = flockProfit.length > 0 ? flockProfit[flockProfit.length - 1] : null;
    alerts.push(worstLoss ? flockLossAlert(worstLoss, thresholds.lossThresholdPesos) : null);

    // Stale pricing: a never-priced size takes priority; otherwise the largest gap.
    const pricingStatuses: PricedSizeStatus[] = prices.map((price) => ({
      name: price.name,
      effectiveFrom: price.currentPrice?.effectiveFrom ?? null,
    }));
    const neverPriced = pricingStatuses.find((status) => status.effectiveFrom === null);
    if (neverPriced) {
      alerts.push(stalePricingAlert(neverPriced, new Date(), thresholds.stalePricingDays));
    } else {
      const worstPricing = pricingStatuses.reduce<{ status: PricedSizeStatus; gap: number } | null>(
        (worst, status) => {
          if (!status.effectiveFrom) return worst;
          const gap = daysBetween(status.effectiveFrom, new Date());
          if (!worst || gap > worst.gap) return { status, gap };
          return worst;
        },
        null
      );
      alerts.push(
        worstPricing
          ? stalePricingAlert(worstPricing.status, new Date(), thresholds.stalePricingDays)
          : null
      );
    }
  }

  return summariseAlerts(alerts);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last 7 days against the 7 before them, aligned by weekday. */
function buildProductionSeries(
  rows: readonly { production_date: string; eggs_collected: number }[],
  today: string
): SeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.production_date, (byDate.get(row.production_date) ?? 0) + row.eggs_collected);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, -(6 - index));
    return {
      day: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      thisWeek: byDate.get(date) ?? 0,
      lastWeek: byDate.get(shiftDate(date, -7)) ?? 0,
    };
  });
}

function buildSalesSeries(
  rows: readonly { sale_date: string; total_amount: number }[],
  today: string
): { day: string; amount: number }[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.sale_date, (byDate.get(row.sale_date) ?? 0) + Number(row.total_amount));
  }

  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = shiftDate(today, -(WINDOW_DAYS - 1 - index));
    return { day: date.slice(8), amount: roundMoney(byDate.get(date) ?? 0) };
  });
}

/** Today's collection split by size, for the donut. */
function buildSizeSlices(rows: readonly SizeProductionRow[]): SizeSlice[] {
  const slices = rows.map((row) => {
    const size = oneOf(row.egg_sizes);
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

function buildActivity(
  rows: readonly { id: string; action: string; metadata: unknown; created_at: string }[]
): ActivityEntry[] {
  return rows.map((row) => {
    const line = describeActivity({
      action: row.action,
      metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    });
    return { id: row.id, title: line.title, detail: line.detail, at: row.created_at };
  });
}
