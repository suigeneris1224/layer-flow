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

export interface Alert {
  level: AlertLevel;
  message: string;
}

/** A day of production, oldest first. */
export interface ProductionPoint {
  date: string;
  eggs: number;
}

export const THRESHOLDS = {
  /** Production drop that is worth mentioning, as a fraction. */
  productionDrop: 0.1,
  /** Feed cost rise worth mentioning. */
  feedCostRise: 0.1,
  /** Daily mortality rate above which we speak up, as a fraction of the flock. */
  dailyMortalityRate: 0.005,
  /** Shift in one egg size's share, in percentage points. */
  eggSizeShift: 10,
} as const;

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

export function productionAlert(points: readonly ProductionPoint[]): Alert | null {
  const comparison = compareRecentToBaseline(points);
  if (!comparison) return null;

  const dropped = -comparison.change;
  if (dropped <= THRESHOLDS.productionDrop) return null;

  return {
    level: dropped > THRESHOLDS.productionDrop * 2 ? "bad" : "warn",
    message: `Egg production is down ${Math.round(dropped * 100)}% compared with your recent average.`,
  };
}

export function feedCostAlert(recentCost: number, baselineCost: number): Alert | null {
  if (baselineCost <= 0) return null;

  const rise = (recentCost - baselineCost) / baselineCost;
  if (rise <= THRESHOLDS.feedCostRise) return null;

  return {
    level: "warn",
    message: `Feed cost is ${Math.round(rise * 100)}% higher than your recent average.`,
  };
}

export function mortalityAlert(deaths: number, hensPresent: number): Alert | null {
  if (hensPresent <= 0 || deaths <= 0) return null;

  const rate = deaths / hensPresent;
  if (rate <= THRESHOLDS.dailyMortalityRate) return null;

  return {
    level: rate > THRESHOLDS.dailyMortalityRate * 3 ? "bad" : "warn",
    message: `Mortality is higher than your normal range (${deaths} today).`,
  };
}

/** A size whose share of the day moved sharply against its recent average. */
export function eggSizeAlert(
  sizeName: string,
  todayShare: number,
  baselineShare: number
): Alert | null {
  const shift = todayShare - baselineShare;
  if (Math.abs(shift) < THRESHOLDS.eggSizeShift) return null;

  return {
    level: "warn",
    message:
      shift < 0
        ? `${sizeName} egg production is lower than your recent average.`
        : `${sizeName} eggs are a bigger share of your collection than usual.`,
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
