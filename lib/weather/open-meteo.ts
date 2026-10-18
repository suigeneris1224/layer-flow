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
 * run on. Data: Open-Meteo.com, CC BY 4.0 -- credited on the privacy page.
 */

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  label: string;
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
  /** Heat index for each hour 0-23, so today's alert can skip hours already gone. */
  heatByHour?: (number | null)[];
}

export interface HistoryDay {
  date: string;
  maxTempC: number | null;
}

/** The temperature at the farm when the forecast was fetched. */
export interface CurrentReading {
  tempC: number;
}

export interface WeatherProvider {
  geocode(municipality: string, province: string): Promise<GeocodedPlace | null>;
  /** The next few days from today, roughly the last 90 days' highs, and the temperature now. */
  forecast(
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<{ days: ForecastDay[]; history: HistoryDay[]; current: CurrentReading | null }>;
}

const TIMEOUT_MS = 8_000;
const FORECAST_DAYS = 4;
const PAST_DAYS = 92;

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
  current?: {
    temperature_2m?: number | null;
  };
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_probability_max: (number | null)[];
    weather_code?: (number | null)[];
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
    url.searchParams.set("current", "temperature_2m");
    url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m");
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
    );

    const data = await getJson<ForecastResponse>(url);
    const daily = data.daily;
    const hourly = data.hourly;
    const nowTempC = data.current?.temperature_2m;
    const current = typeof nowTempC === "number" ? { tempC: nowTempC } : null;
    if (!daily) return { days: [], history: [], current };

    const hoursByDate = new Map<string, HourReading[]>();
    if (hourly) {
      hourly.time.forEach((time, index) => {
        const tempC = hourly.temperature_2m[index];
        const humidityPct = hourly.relative_humidity_2m[index];
        if (tempC === null || humidityPct === null) return;
        const date = time.slice(0, 10);
        const list = hoursByDate.get(date) ?? [];
        list.push({ time, tempC, humidityPct });
        hoursByDate.set(date, list);
      });
    }

    const all = daily.time.map((date, index) => ({
      date,
      maxTempC: daily.temperature_2m_max[index] ?? null,
      rainChancePct: daily.precipitation_probability_max[index] ?? null,
      weatherCode: daily.weather_code?.[index] ?? null,
      minTempC: daily.temperature_2m_min?.[index] ?? null,
    }));

    // The last FORECAST_DAYS entries are today onward; the rest is history.
    const split = Math.max(0, all.length - FORECAST_DAYS);
    const days: ForecastDay[] = all.slice(split).map((day) => {
      const hours = hoursByDate.get(day.date) ?? [];
      const peak = peakHeat(hours);
      const heatByHour: (number | null)[] = Array.from({ length: 24 }, () => null);
      for (const reading of hours) {
        heatByHour[Number(reading.time.slice(11, 13))] = heatIndexC(
          reading.tempC,
          reading.humidityPct
        );
      }
      return {
        ...day,
        peakHeatIndexC: peak?.heatIndexC ?? null,
        peakHour: peak?.hour ?? null,
        heatByHour,
      };
    });
    const history: HistoryDay[] = all
      .slice(0, split)
      .map((day) => ({ date: day.date, maxTempC: day.maxTempC }));

    return { days, history, current };
  },
};
