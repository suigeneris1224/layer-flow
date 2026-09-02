/**
 * Operational alerts.
 *
 * Deterministic rules only -- no AI, no prediction, and explicitly no
 * veterinary or medical judgement. Each rule says what the numbers did and
 * leaves the diagnosis to the farmer, who knows their birds.
 *
 * Pure module: no I/O, so the thresholds are directly testable.
 */

export type AlertLevel = "good" | "warn" | "bad";

/**
 * Which rule fired. Lets a caller persist or dedupe an alert instance --
 * `summariseAlerts`'s good-news placeholder carries no type since it is
 * synthetic, not a rule result.
 */
export type AlertType =
  | "production"
  | "feed_cost"
  | "mortality"
  | "egg_size"
  | "vaccination"
  | "low_inventory"
  | "underperforming_flock"
  | "flock_loss"
  | "stale_pricing";

export interface Alert {
  level: AlertLevel;
  message: string;
  type?: AlertType;
}

/** A day of production, oldest first. */
export interface ProductionPoint {
  date: string;
  eggs: number;
}

/**
 * Default thresholds. Pro farms may override most of these -- see
 * `AlertThresholdOverrides`/`resolveThresholds` below -- but every rule keeps
 * these as its fallback so a farm with no overrides (or not entitled to set
 * any) behaves exactly as before.
 */
export const THRESHOLDS = {
  /** Production drop that is worth mentioning, as a fraction. */
  productionDrop: 0.1,
  /** Feed cost rise worth mentioning. */
  feedCostRise: 0.1,
  /** Daily mortality rate above which we speak up, as a fraction of the flock. */
  dailyMortalityRate: 0.005,
  /** Shift in one egg size's share, in percentage points. */
  eggSizeShift: 10,
  /** Days since the last vaccination before we mention it. */
  vaccinationGapDays: 120,
  /** Total trays on hand at or below which stock is worth flagging. */
  lowInventoryTrays: 5,
  /** Days since a size's price last changed before we call it stale. */
  stalePricingDays: 90,
  /** Percentage points below the farm average laying rate before we flag a flock. */
  underperformancePct: 20,
  /** Weekly loss (pesos) a flock must clear before we mention it. 0 = any loss. */
  lossThresholdPesos: 0,
} as const;

/**
 * Per-farm overrides of `THRESHOLDS`, one field per key, `null` meaning "use
 * the default." Advanced-alerts (Pro) only -- see `resolveThresholds`.
 */
export interface AlertThresholdOverrides {
  productionDrop: number | null;
  feedCostRise: number | null;
  dailyMortalityRate: number | null;
  eggSizeShift: number | null;
  vaccinationGapDays: number | null;
  lowInventoryTrays: number | null;
  stalePricingDays: number | null;
  underperformancePct: number | null;
  lossThresholdPesos: number | null;
}

export type ResolvedThresholds = {
  [K in keyof AlertThresholdOverrides]: number;
};

/**
 * Merge per-farm overrides onto the defaults.
 *
 * A farm not entitled to advanced_alerts always gets pure defaults, even if a
 * stale override row exists from a prior Pro period -- downgrading narrows
 * what a farm can configure, it never deletes the row underneath it.
 */
export function resolveThresholds(
  overrides: AlertThresholdOverrides | null,
  hasAdvancedAlerts: boolean
): ResolvedThresholds {
  if (!hasAdvancedAlerts || !overrides) {
    return { ...THRESHOLDS };
  }

  return {
    productionDrop: overrides.productionDrop ?? THRESHOLDS.productionDrop,
    feedCostRise: overrides.feedCostRise ?? THRESHOLDS.feedCostRise,
    dailyMortalityRate: overrides.dailyMortalityRate ?? THRESHOLDS.dailyMortalityRate,
    eggSizeShift: overrides.eggSizeShift ?? THRESHOLDS.eggSizeShift,
    vaccinationGapDays: overrides.vaccinationGapDays ?? THRESHOLDS.vaccinationGapDays,
    lowInventoryTrays: overrides.lowInventoryTrays ?? THRESHOLDS.lowInventoryTrays,
    stalePricingDays: overrides.stalePricingDays ?? THRESHOLDS.stalePricingDays,
    underperformancePct: overrides.underperformancePct ?? THRESHOLDS.underperformancePct,
    lossThresholdPesos: overrides.lossThresholdPesos ?? THRESHOLDS.lossThresholdPesos,
  };
}

const RECENT_DAYS = 3;
const BASELINE_DAYS = 7;

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Recent average against the preceding baseline.
 *
 * Returns null when there is not enough history to say anything honest --
 * a new farm should get silence, not a fabricated warning.
 */
export function compareRecentToBaseline(
  points: readonly ProductionPoint[],
  recentDays = RECENT_DAYS,
  baselineDays = BASELINE_DAYS
): { recent: number; baseline: number; change: number } | null {
  if (points.length < recentDays + baselineDays) return null;

  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const recentSlice = ordered.slice(-recentDays);
  const baselineSlice = ordered.slice(-(recentDays + baselineDays), -recentDays);

  const recent = mean(recentSlice.map((p) => p.eggs));
  const baseline = mean(baselineSlice.map((p) => p.eggs));

  if (baseline === 0) return null;

  return { recent, baseline, change: (recent - baseline) / baseline };
}

export function productionAlert(
  points: readonly ProductionPoint[],
  threshold: number = THRESHOLDS.productionDrop
): Alert | null {
  const comparison = compareRecentToBaseline(points);
  if (!comparison) return null;

  const dropped = -comparison.change;
  if (dropped <= threshold) return null;

  return {
    level: dropped > threshold * 2 ? "bad" : "warn",
    message: `Egg production is down ${Math.round(dropped * 100)}% compared with your recent average.`,
    type: "production",
  };
}

export function feedCostAlert(
  recentCost: number,
  baselineCost: number,
  threshold: number = THRESHOLDS.feedCostRise
): Alert | null {
  if (baselineCost <= 0) return null;

  const rise = (recentCost - baselineCost) / baselineCost;
  if (rise <= threshold) return null;

  return {
    level: "warn",
    message: `Feed cost is ${Math.round(rise * 100)}% higher than your recent average.`,
    type: "feed_cost",
  };
}

export function mortalityAlert(
  deaths: number,
  hensPresent: number,
  threshold: number = THRESHOLDS.dailyMortalityRate
): Alert | null {
  if (hensPresent <= 0 || deaths <= 0) return null;

  const rate = deaths / hensPresent;
  if (rate <= threshold) return null;

  return {
    level: rate > threshold * 3 ? "bad" : "warn",
    message: `Mortality is higher than your normal range (${deaths} today).`,
    type: "mortality",
  };
}

/** A size whose share of the day moved sharply against its recent average. */
export function eggSizeAlert(
  sizeName: string,
  todayShare: number,
  baselineShare: number,
  threshold: number = THRESHOLDS.eggSizeShift
): Alert | null {
  const shift = todayShare - baselineShare;
  if (Math.abs(shift) < threshold) return null;

  return {
    level: "warn",
    message:
      shift < 0
        ? `${sizeName} egg production is lower than your recent average.`
        : `${sizeName} eggs are a bigger share of your collection than usual.`,
    type: "egg_size",
  };
}

/** A flock, for the vaccination rule. */
export interface VaccinationStatus {
  flockName: string;
  /** ISO date of the most recent vaccination, or null if there is none. */
  lastVaccinationDate: string | null;
  /** ISO date the flock was placed. */
  placementDate: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two ISO dates, floored at zero. */
export function daysBetween(from: string, to: Date): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((to.getTime() - start) / MS_PER_DAY));
}

/**
 * A flock that has gone a long time without a vaccination on record.
 *
 * This is a record-keeping reminder, not veterinary advice: it reports the gap
 * in the farmer's own log and names no vaccine and no schedule. Programmes vary
 * by region, hatchery and disease pressure, and choosing one is the vet's job.
 *
 * A flock younger than the threshold is skipped -- there is nothing to be late
 * for yet, and warning a farmer about a two-week-old flock trains them to
 * ignore the panel.
 */
export function vaccinationAlert(
  flock: VaccinationStatus,
  asOf: Date = new Date(),
  gapDays: number = THRESHOLDS.vaccinationGapDays
): Alert | null {
  if (daysBetween(flock.placementDate, asOf) < gapDays) {
    return null;
  }

  if (flock.lastVaccinationDate === null) {
    return {
      level: "warn",
      message: `${flock.flockName} has no vaccination recorded.`,
      type: "vaccination",
    };
  }

  const gap = daysBetween(flock.lastVaccinationDate, asOf);
  if (gap <= gapDays) return null;

  return {
    level: "warn",
    message: `${flock.flockName} has had no vaccination recorded in ${gap} days.`,
    type: "vaccination",
  };
}

/**
 * Low egg inventory, Pro only.
 *
 * `bad` when the shed has nothing left to sell at all; `warn` at or below the
 * threshold otherwise. Only fires below/at the line, never on a healthy stock.
 */
export function lowInventoryAlert(
  totalTrays: number,
  threshold: number = THRESHOLDS.lowInventoryTrays
): Alert | null {
  if (totalTrays > threshold) return null;

  return {
    level: totalTrays <= 0 ? "bad" : "warn",
    message:
      totalTrays <= 0
        ? "Egg inventory is empty."
        : `Only ${totalTrays} tray${totalTrays === 1 ? "" : "s"} left in stock.`,
    type: "low_inventory",
  };
}

export interface FlockLayingPerformance {
  name: string;
  layingRate: number;
}

/**
 * A flock laying well below the farm's own average, Pro only.
 *
 * Compared against the farm's other active flocks, not an industry figure --
 * this says "this flock is off pace for your farm," nothing more specific.
 */
export function underperformingFlockAlert(
  flock: FlockLayingPerformance,
  farmAvgLayingRate: number,
  thresholdPct: number = THRESHOLDS.underperformancePct
): Alert | null {
  if (farmAvgLayingRate <= 0) return null;

  const deficitPct = ((farmAvgLayingRate - flock.layingRate) / farmAvgLayingRate) * 100;
  if (deficitPct <= thresholdPct) return null;

  return {
    level: "warn",
    message: `${flock.name} is laying well below your other flocks.`,
    type: "underperforming_flock",
  };
}

export interface FlockWeeklyProfit {
  name: string;
  profit: number;
}

/**
 * A flock running at a loss over the trailing week, Pro only.
 *
 * `thresholdPesos` is a magnitude: 0 means "any loss at all," a larger value
 * means "only a loss past this size."
 */
export function flockLossAlert(
  flock: FlockWeeklyProfit,
  thresholdPesos: number = THRESHOLDS.lossThresholdPesos
): Alert | null {
  if (flock.profit >= -thresholdPesos) return null;

  return {
    level: "warn",
    message: `${flock.name} is running at a loss this week.`,
    type: "flock_loss",
  };
}

export interface PricedSizeStatus {
  name: string;
  /** ISO date the current price took effect, or null if never priced. */
  effectiveFrom: string | null;
}

/**
 * A size that has never been priced, or hasn't had its price revisited in a
 * long time, Pro only. Mirrors `vaccinationAlert`'s "gap since X" shape.
 */
export function stalePricingAlert(
  size: PricedSizeStatus,
  asOf: Date = new Date(),
  thresholdDays: number = THRESHOLDS.stalePricingDays
): Alert | null {
  if (size.effectiveFrom === null) {
    return {
      level: "warn",
      message: `${size.name} has never been priced.`,
      type: "stale_pricing",
    };
  }

  const gap = daysBetween(size.effectiveFrom, asOf);
  if (gap <= thresholdDays) return null;

  return {
    level: "warn",
    message: `${size.name} pricing hasn't been updated in ${gap} days.`,
    type: "stale_pricing",
  };
}

/**
 * Collapse the rules into what the dashboard shows.
 *
 * When nothing fired we say so positively -- an empty alert panel reads as
 * broken, not as "all fine".
 */
export function summariseAlerts(alerts: readonly (Alert | null)[]): Alert[] {
  const firing = alerts.filter((alert): alert is Alert => alert !== null);

  if (firing.length === 0) {
    return [{ level: "good", message: "Production is normal." }];
  }

  const severity: Record<AlertLevel, number> = { bad: 0, warn: 1, good: 2 };
  return firing.sort((a, b) => severity[a.level] - severity[b.level]);
}
