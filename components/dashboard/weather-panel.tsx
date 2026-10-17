import Link from "next/link";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSun,
  Droplet,
  Moon,
  Sun,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { InfoTip } from "@/components/ui/info-tip";
import type { WeatherResult } from "@/lib/data/weather";
import type { ForecastDay, ForecastHour } from "@/lib/weather/open-meteo";
import {
  HEAT_LEVEL_LABELS,
  describeWeatherCode,
  formatHour,
  heatIndexLevel,
  isAtLeast,
  weatherTheme,
  type WeatherKind,
  type WeatherTheme,
} from "@/lib/domain/weather";
import { farmHour, farmToday, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Full class strings, so Tailwind sees every one at build time. */
const THEME_BACKGROUND: Record<WeatherTheme, string> = {
  heat: "bg-gradient-to-br from-[hsl(var(--wx-heat-from))] to-[hsl(var(--wx-heat-to))]",
  hot: "bg-gradient-to-br from-[hsl(var(--wx-hot-from))] to-[hsl(var(--wx-hot-to))]",
  rain: "bg-gradient-to-br from-[hsl(var(--wx-rain-from))] to-[hsl(var(--wx-rain-to))]",
  storm: "bg-gradient-to-br from-[hsl(var(--wx-storm-from))] to-[hsl(var(--wx-storm-to))]",
  clear: "bg-gradient-to-br from-[hsl(var(--wx-clear-from))] to-[hsl(var(--wx-clear-to))]",
  cloudy: "bg-gradient-to-br from-[hsl(var(--wx-cloudy-from))] to-[hsl(var(--wx-cloudy-to))]",
};

/** The theme's colour as an accent on the plain forecast tiles. */
const THEME_ACCENT: Record<WeatherTheme, string> = {
  heat: "border-t-[hsl(var(--wx-heat-from))]",
  hot: "border-t-[hsl(var(--wx-hot-from))]",
  rain: "border-t-[hsl(var(--wx-rain-from))]",
  storm: "border-t-[hsl(var(--wx-storm-from))]",
  clear: "border-t-[hsl(var(--wx-clear-from))]",
  cloudy: "border-t-[hsl(var(--wx-cloudy-from))]",
};

const THEME_ICON_COLOR: Record<WeatherTheme, string> = {
  heat: "text-[hsl(var(--wx-heat-from))]",
  hot: "text-[hsl(var(--wx-hot-from))]",
  rain: "text-[hsl(var(--wx-rain-from))]",
  storm: "text-[hsl(var(--wx-storm-from))]",
  clear: "text-[hsl(var(--wx-clear-from))]",
  cloudy: "text-[hsl(var(--wx-cloudy-from))]",
};

const DAY_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy_rain: CloudRainWind,
  thunderstorm: CloudLightning,
};

function weatherIcon(code: number | null | undefined, isDay = true): LucideIcon | null {
  const kind = describeWeatherCode(code)?.kind;
  if (!kind) return null;
  if (!isDay && kind === "clear") return Moon;
  if (!isDay && kind === "partly_cloudy") return CloudMoon;
  return DAY_ICONS[kind];
}

/** A day's icon, falling back from the code to what heat and rain say. */
function dayIcon(day: ForecastDay): LucideIcon {
  const icon = weatherIcon(day.weatherCode);
  if (icon) return icon;
  const theme = weatherTheme(day);
  if (theme === "rain") return CloudRain;
  if (theme === "storm") return CloudLightning;
  return Thermometer;
}

const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

function dayName(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

const degrees = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value)}°`;

/** From the current 3-hour slot onward, today then tomorrow. */
function upcomingHours(days: ForecastDay[], timezone: string): ForecastHour[] {
  const today = farmToday(timezone);
  const slot = `${today}T${String(Math.floor(farmHour(timezone) / 3) * 3).padStart(2, "0")}`;
  return days
    .slice(0, 2)
    .flatMap((day) => day.hours ?? [])
    .filter((hour) => hour.time.slice(0, 13) >= slot)
    .slice(0, 8);
}

/**
 * The farm's weather, laid out like a weather app: today on a card coloured
 * by the conditions (storm, rain, heat, clear, cloudy), the next hours along
 * its foot, and the next two days beside it. Led by the heat index -- the
 * number PAGASA warns on. It reports the weather and PAGASA's level; what to
 * do about a hot day is the farmer's call.
 */
export function WeatherPanel({
  weather,
  timezone,
  canEditFarm,
  className,
}: {
  weather: WeatherResult;
  timezone: string;
  canEditFarm: boolean;
  className?: string;
}) {
  const title = (
    <h2 className="flex items-center gap-1 text-sm font-semibold">
      Weather
      <InfoTip label="About the heat index">
        The heat index is how hot it feels once humidity is counted, the number PAGASA uses for
        its heat warnings. Levels: Caution 27–32°C, Extreme caution 33–41°C, Danger 42–51°C,
        Extreme danger 52°C and up.
      </InfoTip>
    </h2>
  );

  if (weather.status !== "ok" || weather.days.length === 0) {
    const message =
      weather.status === "no_location"
        ? "Add your farm's municipality and province to see the forecast."
        : weather.status === "not_found"
          ? `We couldn't find "${weather.query}". Check the spelling of your farm's municipality and province.`
          : "The forecast isn't available right now. Try again in a little while.";
    return (
      <Panel title={title} className={className}>
        <p className="text-sm text-muted-foreground">
          {message}{" "}
          {(weather.status === "no_location" || weather.status === "not_found") && canEditFarm && (
            <Link href="/farms" className="font-medium underline">
              Farm settings
            </Link>
          )}
        </p>
      </Panel>
    );
  }

  const [today, ...later] = weather.days;
  const theme = weatherTheme(today);
  const condition = describeWeatherCode(today.weatherCode);
  const TodayIcon = dayIcon(today);
  const level = today.peakHeatIndexC === null ? null : heatIndexLevel(today.peakHeatIndexC);
  const hours = upcomingHours(weather.days, timezone);

  return (
    <Panel
      title={title}
      className={className}
      action={<span className="truncate text-xs text-muted-foreground">{weather.label}</span>}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Today */}
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-xl p-4 text-[hsl(var(--wx-foreground))] shadow-card sm:p-5",
            THEME_BACKGROUND[theme]
          )}
        >
          {/* Soft light in the corner -- decoration only. */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 -z-10 size-56 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <TodayIcon
                className={cn(
                  "size-14 shrink-0 drop-shadow sm:size-16",
                  TodayIcon === Sun && "motion-safe:animate-[spin_40s_linear_infinite]"
                )}
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-white/90">Today</p>
                <p className="flex items-baseline gap-2 tabular">
                  <span className="text-5xl font-semibold leading-none">
                    {degrees(today.maxTempC)}
                  </span>
                  {today.minTempC != null && (
                    <span className="text-lg text-white/90">/ {degrees(today.minTempC)}</span>
                  )}
                </p>
                {condition && <p className="mt-1 text-sm font-medium">{condition.label}</p>}
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
              {today.peakHeatIndexC !== null && (
                <p className="tabular">
                  Feels like <span className="font-semibold">{degrees(today.peakHeatIndexC)}</span>
                  {today.peakHour !== null && (
                    <span className="text-white/90"> at {formatHour(today.peakHour)}</span>
                  )}
                </p>
              )}
              {level && level !== "none" && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-white/40">
                  {HEAT_LEVEL_LABELS[level]}
                </span>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/90 tabular">
                {today.rainChancePct !== null && (
                  <span className="flex items-center gap-1">
                    <Droplet className="size-3.5" aria-hidden />
                    {today.rainChancePct}% rain
                  </span>
                )}
                {today.windMaxKmh != null && (
                  <span className="flex items-center gap-1">
                    <Wind className="size-3.5" aria-hidden />
                    {Math.round(today.windMaxKmh)} km/h
                  </span>
                )}
              </div>
            </div>
          </div>

          {hours.length > 0 && (
            <ul
              className="-mx-1 mt-5 flex gap-1 overflow-x-auto border-t border-white/25 pt-3"
              aria-label="Next hours"
            >
              {hours.map((hour) => {
                const HourIcon = weatherIcon(hour.weatherCode, hour.isDay) ?? Thermometer;
                const label = describeWeatherCode(hour.weatherCode)?.label;
                return (
                  <li
                    key={hour.time}
                    className="flex min-w-[3.75rem] flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center"
                  >
                    <span className="text-[11px] font-medium text-white/90">
                      {formatHour(Number(hour.time.slice(11, 13)))}
                    </span>
                    <HourIcon className="size-5" strokeWidth={1.75} aria-label={label} />
                    <span className="text-sm font-semibold tabular">{degrees(hour.tempC)}</span>
                    <span className="h-4 text-[11px] tabular text-white/90">
                      {hour.rainChancePct !== null && hour.rainChancePct >= 20
                        ? `${hour.rainChancePct}%`
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Next days */}
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {later.map((day, index) => {
            const dayTheme = weatherTheme(day);
            const DayIcon = dayIcon(day);
            const dayLevel =
              day.peakHeatIndexC === null ? null : heatIndexLevel(day.peakHeatIndexC);
            const label = describeWeatherCode(day.weatherCode)?.label;
            return (
              <li
                key={day.date}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border border-t-4 border-border bg-surface p-3",
                  THEME_ACCENT[dayTheme]
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {dayName(day.date, index + 1)}
                  </p>
                  <DayIcon
                    className={cn("size-7 shrink-0", THEME_ICON_COLOR[dayTheme])}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <p className="flex items-baseline gap-1.5 tabular">
                  <span className="text-2xl font-semibold leading-none">
                    {degrees(day.maxTempC)}
                  </span>
                  {day.minTempC != null && (
                    <span className="text-sm text-muted-foreground">/ {degrees(day.minTempC)}</span>
                  )}
                </p>
                {label && <p className="text-xs font-medium">{label}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular text-muted-foreground">
                  {day.peakHeatIndexC !== null && <span>Feels {degrees(day.peakHeatIndexC)}</span>}
                  {day.rainChancePct !== null && (
                    <span className="flex items-center gap-1">
                      <Droplet className="size-3" aria-hidden />
                      {day.rainChancePct}%
                    </span>
                  )}
                </div>
                {dayLevel && isAtLeast(dayLevel, "extreme_caution") && (
                  <span
                    className={cn(
                      "self-start rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      isAtLeast(dayLevel, "danger")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]"
                    )}
                  >
                    {HEAT_LEVEL_LABELS[dayLevel]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
        <CloudSun className="size-3" aria-hidden />
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Weather data by Open-Meteo.com
        </a>
        {weather.stale && (
          <span>· Last updated {formatRelativeDay(weather.fetchedAt.slice(0, 10), timezone)}</span>
        )}
      </p>
    </Panel>
  );
}
