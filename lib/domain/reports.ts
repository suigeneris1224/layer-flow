import { shiftDate } from "@/lib/format";

/**
 * Date ranges for Analytics/Reports/Categories.
 *
 * A plain string rather than a union of fixed day-counts, since "This month"
 * and "August 2026" are calendar-aligned, not N-days-back -- the resolved
 * `{from, to}` window is what every query actually uses.
 */
export type ReportRangeValue =
  | "week"
  | "month"
  | "30"
  | "90"
  | "year"
  | `m:${string}` // m:YYYY-MM, a specific past month
  | `y:${string}`; // y:YYYY, a specific past year

export interface ResolvedRange {
  value: ReportRangeValue;
  from: string;
  to: string;
  label: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Never let a resolved range reach into the future -- there is nothing to show there. */
function clampToToday(date: string, today: string): string {
  return date > today ? today : date;
}

export function resolveReportRange(raw: string | undefined, today: string): ResolvedRange {
  const value = (raw as ReportRangeValue | undefined) ?? "30";

  if (value.startsWith("m:")) {
    const ym = value.slice(2);
    const [year, month] = ym.split("-").map(Number);
    if (Number.isFinite(year) && month >= 1 && month <= 12) {
      const from = `${ym}-01`;
      const to = `${ym}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
      return { value, from, to: clampToToday(to, today), label: monthLabel(ym) };
    }
  }

  if (value.startsWith("y:")) {
    const year = value.slice(2);
    if (/^\d{4}$/.test(year)) {
      return {
        value,
        from: `${year}-01-01`,
        to: clampToToday(`${year}-12-31`, today),
        label: year,
      };
    }
  }

  switch (value) {
    case "week": {
      const day = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
      const from = shiftDate(today, -((day + 6) % 7)); // back to Monday
      return { value: "week", from, to: today, label: "This week" };
    }
    case "month": {
      const from = `${today.slice(0, 7)}-01`;
      return { value: "month", from, to: today, label: "This month" };
    }
    case "year": {
      const from = `${today.slice(0, 4)}-01-01`;
      return { value: "year", from, to: today, label: "This year" };
    }
    case "90":
      return { value: "90", from: shiftDate(today, -89), to: today, label: "Last 90 days" };
    case "30":
    default:
      return { value: "30", from: shiftDate(today, -29), to: today, label: "Last 30 days" };
  }
}

export interface RangeOption {
  value: string;
  label: string;
}

/** The last `count` full calendar months, newest first, for the month picker. */
export function listRecentMonths(today: string, count = 24): RangeOption[] {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const offset = month - 1 - index;
    const y = year + Math.floor(offset / 12);
    const m = ((offset % 12) + 12) % 12; // 0-11
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    return { value: `m:${ym}`, label: monthLabel(ym) };
  });
}

/** Inclusive day count between two ISO dates, for sizing a "previous period" comparison window. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Every date from `from` to `to`, inclusive, for building a daily series over any resolved range. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = shiftDate(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

/** The last `count` calendar years, newest first, for the year picker. */
export function listRecentYears(today: string, count = 5): RangeOption[] {
  const year = Number(today.slice(0, 4));
  return Array.from({ length: count }, (_, index) => {
    const y = String(year - index);
    return { value: `y:${y}`, label: y };
  });
}
