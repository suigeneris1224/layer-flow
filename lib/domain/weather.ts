/**
 * Weather math: heat index and PAGASA's heat-index levels.
 *
 * Open-Meteo gives temperature and humidity, not a heat index, so it is
 * computed here with the NOAA (Rothfusz) regression -- the same heat index
 * PAGASA publishes. The levels are PAGASA's published bands. Nothing here
 * says what heat does to hens: the app reports the weather and leaves the
 * judgement to the farmer, same stance as lib/domain/alerts.ts.
 *
 * Pure module, no I/O.
 */

const toF = (c: number) => (c * 9) / 5 + 32;
const toC = (f: number) => ((f - 32) * 5) / 9;

/**
 * Heat index (°C) from air temperature (°C) and relative humidity (%), per the
 * NOAA Weather Prediction Center's algorithm: the simple formula below ~80 °F,
 * the Rothfusz regression with its two adjustments above.
 */
export function heatIndexC(tempC: number, humidityPct: number): number {
  const t = toF(tempC);
  const rh = Math.min(100, Math.max(0, humidityPct));

  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  if ((simple + t) / 2 < 80) return Math.round(toC(simple) * 10) / 10;

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;

  if (rh < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (rh > 85 && t >= 80 && t <= 87) {
    hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }

  return Math.round(toC(hi) * 10) / 10;
}

export type HeatLevel = "none" | "caution" | "extreme_caution" | "danger" | "extreme_danger";

/** PAGASA's heat-index classification. */
export function heatIndexLevel(heatIndex: number): HeatLevel {
  if (heatIndex >= 52) return "extreme_danger";
  if (heatIndex >= 42) return "danger";
  if (heatIndex >= 33) return "extreme_caution";
  if (heatIndex >= 27) return "caution";
  return "none";
}

export const HEAT_LEVEL_LABELS: Record<HeatLevel, string> = {
  none: "Comfortable",
  caution: "Caution",
  extreme_caution: "Extreme caution",
  danger: "Danger",
  extreme_danger: "Extreme danger",
};

const LEVEL_RANK: Record<HeatLevel, number> = {
  none: 0,
  caution: 1,
  extreme_caution: 2,
  danger: 3,
  extreme_danger: 4,
};

export function isAtLeast(level: HeatLevel, minimum: HeatLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minimum];
}

export interface HourReading {
  /** Local time, "YYYY-MM-DDTHH:mm". */
  time: string;
  tempC: number;
  humidityPct: number;
}

/** The hottest hour of a day by heat index. Null for no readings. */
export function peakHeat(hours: readonly HourReading[]): { heatIndexC: number; hour: number } | null {
  let best: { heatIndexC: number; hour: number } | null = null;
  for (const reading of hours) {
    const value = heatIndexC(reading.tempC, reading.humidityPct);
    if (best === null || value > best.heatIndexC) {
      best = { heatIndexC: value, hour: Number(reading.time.slice(11, 13)) };
    }
  }
  return best;
}

/** "2 PM", the way the forecast reads aloud. */
export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** "Updated just now" / "Updated 25 min ago" / "Updated 3 hr ago" / "Updated 2 days ago". */
export function updatedAgo(fetchedAt: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(fetchedAt)) / 60_000));
  if (minutes < 2) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Updated yesterday" : `Updated ${days} days ago`;
}

/**
 * Past this, the reading taken at fetch time is no longer "now" -- it's
 * labelled with its time instead. A little over the 1-hour refresh, so a
 * normal snapshot always reads "Now".
 */
export const NOW_MAX_AGE_MINUTES = 75;

/** True when a reading taken at `fetchedAt` can still be called "now". */
export function isCurrentReading(fetchedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - Date.parse(fetchedAt) <= NOW_MAX_AGE_MINUTES * 60_000;
}

/** A forecast day reduced to what the panel and the heat alert need. */
export interface ForecastDaySummary {
  date: string;
  maxTempC: number | null;
  rainChancePct: number | null;
  peakHeatIndexC: number | null;
  peakHour: number | null;
}

const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "UTC" });

function dayLabel(date: string, today: string): string {
  const diff = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `on ${WEEKDAY.format(new Date(`${date}T00:00:00Z`))}`;
}

/**
 * Today and tomorrow only, for `heatAlert`: far enough ahead to prepare,
 * near enough that the forecast is worth acting on.
 */
export function heatDaysForAlert(days: readonly ForecastDaySummary[], today: string) {
  return days
    .filter((day) => day.date >= today && day.peakHeatIndexC !== null)
    .slice(0, 2)
    .map((day) => {
      const level = heatIndexLevel(day.peakHeatIndexC!);
      return {
        label: dayLabel(day.date, today),
        peakHeatIndexC: day.peakHeatIndexC!,
        levelLabel: HEAT_LEVEL_LABELS[level],
        significant: isAtLeast(level, "extreme_caution"),
        danger: isAtLeast(level, "danger"),
        peakHour: day.peakHour === null ? "midday" : formatHour(day.peakHour),
      };
    });
}

export type WeatherKind =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "thunderstorm";

/**
 * WMO weather interpretation code (what Open-Meteo returns as `weather_code`)
 * to a kind for the icon and a plain label. Null for a missing or unknown
 * code. Snow codes exist in the standard but not in the Philippines; they
 * read as cloudy rather than inventing an icon nobody will see.
 */
export function describeWeatherCode(
  code: number | null | undefined
): { kind: WeatherKind; label: string } | null {
  if (code === null || code === undefined) return null;
  switch (code) {
    case 0:
      return { kind: "clear", label: "Sunny" };
    case 1:
      return { kind: "clear", label: "Mostly Sunny" };
    case 2:
      return { kind: "partly_cloudy", label: "Partly Cloudy" };
    case 3:
      return { kind: "cloudy", label: "Cloudy" };
    case 45:
    case 48:
      return { kind: "fog", label: "Foggy" };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { kind: "drizzle", label: "Drizzle" };
    case 61:
    case 80:
      return { kind: "rain", label: "Light Rain" };
    case 63:
    case 66:
    case 81:
      return { kind: "rain", label: "Rain" };
    case 65:
    case 67:
    case 82:
      return { kind: "heavy_rain", label: "Heavy Rain" };
    case 95:
    case 96:
    case 99:
      return { kind: "thunderstorm", label: "Thunderstorms" };
    default:
      if (code >= 71 && code <= 86) return { kind: "cloudy", label: "Cloudy" };
      return null;
  }
}

/** Lowercase, no accents, no "city of"/"province of" noise -- for matching admin names. */
function normalisePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(city of|city|province of|province|municipality of)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface PlaceCandidate {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  population?: number;
}

/**
 * Choose the geocoding result for a farm's municipality + province.
 *
 * Many PH place names repeat across provinces ("San Jose", "Santa Cruz",
 * "Lipa"), so only results whose admin area matches the province count; among
 * those, the most populous wins (the town itself over a same-named barangay).
 * Null when nothing matches the province -- a wrong-province forecast is worse
 * than none.
 */
export function pickPlace(
  results: readonly PlaceCandidate[],
  province: string
): { latitude: number; longitude: number; label: string } | null {
  const wanted = normalisePlace(province);
  const candidates = wanted
    ? results.filter((place) =>
        [place.admin1, place.admin2, place.admin3]
          .filter((area): area is string => Boolean(area))
          .some((area) => normalisePlace(area) === wanted)
      )
    : results;
  if (candidates.length === 0) return null;

  const best = [...candidates].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];
  const area = (best.admin2 ?? best.admin1 ?? "").replace(/^Province of /, "");
  return {
    latitude: best.latitude,
    longitude: best.longitude,
    label: [best.name, area].filter(Boolean).join(", "),
  };
}
