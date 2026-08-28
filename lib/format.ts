/**
 * Display formatting. Philippine defaults; currency is passed in so a farm on
 * another currency later needs no code change here.
 */

const PH_LOCALE = "en-PH";

export function formatCurrency(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat(PH_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Just the symbol, for a leading input adornment on money fields. */
export function currencySymbol(currency = "PHP"): string {
  return (
    new Intl.NumberFormat(PH_LOCALE, { style: "currency", currency })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

/** Compact money for dashboard tiles, where centavos are noise. */
export function formatCurrencyShort(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat(PH_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(PH_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)}%`;
}

export function formatKg(value: number): string {
  return `${formatNumber(value, value < 10 ? 2 : 0)} kg`;
}

/**
 * Today in the farm's timezone as YYYY-MM-DD.
 *
 * Server and phone are frequently in different zones; "today" must always mean
 * today on the farm, or a Manila farmer recording at 8am gets yesterday's date
 * from a UTC server.
 */
export function farmToday(timezone = "Asia/Manila", now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The hour of day at the farm, 0-23.
 *
 * Same reasoning as farmToday: a Manila farmer at 7am must not be greeted with
 * "Good evening" because the server is on UTC.
 */
export function farmHour(timezone = "Asia/Manila", now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed % 24 : 0;
}

export function formatDate(date: string | Date, timezone = "Asia/Manila"): string {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatDateShort(date: string | Date, timezone = "Asia/Manila"): string {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: timezone,
    day: "numeric",
    month: "short",
  }).format(value);
}

/** "today" / "yesterday" / a short date, for record lists. */
export function formatRelativeDay(date: string, timezone = "Asia/Manila"): string {
  const today = farmToday(timezone);
  if (date === today) return "Today";

  // Must go through shiftDate: building a Date from a local-midnight string
  // and calling toISOString() lands on the previous day for any timezone ahead
  // of UTC, which is every farm we serve.
  if (date === shiftDate(today, -1)) return "Yesterday";

  return formatDateShort(date, timezone);
}

/** Add or subtract days from a YYYY-MM-DD string without timezone drift. */
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
