import "server-only";

import { serverEnv } from "@/lib/config/env";
import { heatIndexC, peakHeat, pickPlace, type HourReading } from "@/lib/domain/weather";

/**
 * Open-Meteo adapter -- the only file that knows the provider's URLs and
 * response shapes. Everything else uses `WeatherProvider`, so swapping
 * providers is a one-file change.
 *
 * Free API by default (non-commercial use only). Setting OPEN_METEO_API_KEY
 * switches to the customer-api hosts, which is what a paying LayerFlow should
 * run on. Data: Open-Meteo.com, CC BY 4.0 -- shown on the weather panel.
 */

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  label: string;
}

export interface ForecastHour {
  /** Local time, "YYYY-MM-DDTHH:mm". */
  time: string;
  tempC: number;
  heatIndexC: number | null;
  weatherCode: number | null;
  rainChancePct: number | null;
  isDay: boolean;
}

export interface ForecastDay {
  date: string;
  maxTempC: number | null;
  rainChancePct: number | null;
  peakHeatIndexC: number | null;
  /** Hour (0-23) of the peak heat index. */
  peakHour: number | null;
  /*
   * Optional: snapshots saved before these were fetched don't have them, and
   * the panel falls back without them.
   */
  /** WMO weather interpretation code -- see describeWeatherCode. */
  weatherCode?: number | null;
  minTempC?: number | null;
  windMaxKmh?: number | null;
  /** Every 3rd hour, for today and tomorrow only (keeps the snapshot small). */
  hours?: ForecastHour[];
}

export interface HistoryDay {
  date: string;
  maxTempC: number | null;
}

export interface WeatherProvider {
  geocode(municipality: string, province: string): Promise<GeocodedPlace | null>;
  /** The next few days from today, plus roughly the last 90 days' highs. */
  forecast(
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<{ days: ForecastDay[]; history: HistoryDay[] }>;
}

const TIMEOUT_MS = 8_000;
const FORECAST_DAYS = 3;
const PAST_DAYS = 92;
const HOURLY_DAYS = 2;
const HOUR_STEP = 3;

function host(name: "geocoding-api" | "api"): string {
  const key = serverEnv.openMeteoApiKey;
  if (!key) return `https://${name}.open-meteo.com`;
  return name === "api"
    ? "https://customer-api.open-meteo.com"
    : "https://customer-geocoding-api.open-meteo.com";
}

function withKey(url: URL): URL {
  const key = serverEnv.openMeteoApiKey;
  if (key) url.searchParams.set("apikey", key);
  return url;
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo ${url.pathname} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

interface GeocodingResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    admin2?: string;
    admin3?: string;
    feature_code?: string;
    population?: number;
  }[];
}

interface ForecastResponse {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    weather_code?: (number | null)[];
    precipitation_probability?: (number | null)[];
    is_day?: (number | null)[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_probability_max: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
  };
}

export const openMeteo: WeatherProvider = {
  async geocode(municipality, province) {
    const name = municipality.trim();
    if (!name) return null;

    const url = withKey(new URL("/v1/search", host("geocoding-api")));
    url.searchParams.set("name", name);
    url.searchParams.set("countryCode", "PH");
    url.searchParams.set("count", "20");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const data = await getJson<GeocodingResponse>(url);
    return pickPlace(data.results ?? [], province);
  },

  async forecast(latitude, longitude, timezone) {
    const url = withKey(new URL("/v1/forecast", host("api")));
    url.searchParams.set("latitude", latitude.toFixed(4));
    url.searchParams.set("longitude", longitude.toFixed(4));
    url.searchParams.set("timezone", timezone);
    url.searchParams.set("forecast_days", String(FORECAST_DAYS));
    url.searchParams.set("past_days", String(PAST_DAYS));
    url.searchParams.set(
      "hourly",
      "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,is_day"
    );
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max"
    );

    const data = await getJson<ForecastResponse>(url);
    const daily = data.daily;
    const hourly = data.hourly;
    if (!daily) return { days: [], history: [] };

    const hoursByDate = new Map<string, HourReading[]>();
    const stripByDate = new Map<string, ForecastHour[]>();
    if (hourly) {
      hourly.time.forEach((time, index) => {
        const tempC = hourly.temperature_2m[index];
        const humidityPct = hourly.relative_humidity_2m[index];
        if (tempC === null) return;
        const date = time.slice(0, 10);

        if (humidityPct !== null) {
          const list = hoursByDate.get(date) ?? [];
          list.push({ time, tempC, humidityPct });
          hoursByDate.set(date, list);
        }

        if (Number(time.slice(11, 13)) % HOUR_STEP === 0) {
          const strip = stripByDate.get(date) ?? [];
          strip.push({
            time,
            tempC,
            heatIndexC: humidityPct === null ? null : heatIndexC(tempC, humidityPct),
            weatherCode: hourly.weather_code?.[index] ?? null,
            rainChancePct: hourly.precipitation_probability?.[index] ?? null,
            isDay: (hourly.is_day?.[index] ?? 1) === 1,
          });
          stripByDate.set(date, strip);
        }
      });
    }

    const all = daily.time.map((date, index) => ({
      date,
      maxTempC: daily.temperature_2m_max[index] ?? null,
      rainChancePct: daily.precipitation_probability_max[index] ?? null,
      weatherCode: daily.weather_code?.[index] ?? null,
      minTempC: daily.temperature_2m_min?.[index] ?? null,
      windMaxKmh: daily.wind_speed_10m_max?.[index] ?? null,
    }));

    // The last FORECAST_DAYS entries are today onward; the rest is history.
    const split = Math.max(0, all.length - FORECAST_DAYS);
    const days: ForecastDay[] = all.slice(split).map((day, index) => {
      const peak = peakHeat(hoursByDate.get(day.date) ?? []);
      return {
        ...day,
        peakHeatIndexC: peak?.heatIndexC ?? null,
        peakHour: peak?.hour ?? null,
        ...(index < HOURLY_DAYS ? { hours: stripByDate.get(day.date) ?? [] } : {}),
      };
    });
    const history: HistoryDay[] = all
      .slice(0, split)
      .map((day) => ({ date: day.date, maxTempC: day.maxTempC }));

    return { days, history };
  },
};
