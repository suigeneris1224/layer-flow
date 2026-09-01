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
export type AlertType = "production" | "feed_cost" | "mortality" | "egg_size" | "vaccination";

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
    type: "production",
  };
}

export function feedCostAlert(recentCost: number, baselineCost: number): Alert | null {
  if (baselineCost <= 0) return null;

  const rise = (recentCost - baselineCost) / baselineCost;
  if (rise <= THRESHOLDS.feedCostRise) return null;

  return {
    level: "warn",
    message: `Feed cost is ${Math.round(rise * 100)}% higher than your recent average.`,
    type: "feed_cost",
  };
}

export function mortalityAlert(deaths: number, hensPresent: number): Alert | null {
  if (hensPresent <= 0 || deaths <= 0) return null;

  const rate = deaths / hensPresent;
  if (rate <= THRESHOLDS.dailyMortalityRate) return null;

  return {
    level: rate > THRESHOLDS.dailyMortalityRate * 3 ? "bad" : "warn",
    message: `Mortality is higher than your normal range (${deaths} today).`,
    type: "mortality",
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
function daysBetween(from: string, to: Date): number {
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
  asOf: Date = new Date()
): Alert | null {
  if (daysBetween(flock.placementDate, asOf) < THRESHOLDS.vaccinationGapDays) {
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
  if (gap <= THRESHOLDS.vaccinationGapDays) return null;

  return {
    level: "warn",
    message: `${flock.flockName} has had no vaccination recorded in ${gap} days.`,
    type: "vaccination",
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
