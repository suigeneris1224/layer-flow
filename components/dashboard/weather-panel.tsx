import Link from "next/link";
import { CloudSun, Droplet, MapPin } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { WeatherIcon, WeatherIconDefs } from "@/components/dashboard/weather-icon";
import type { WeatherResult } from "@/lib/data/weather";
import type { ForecastDay } from "@/lib/weather/open-meteo";
import { describeWeatherCode } from "@/lib/domain/weather";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const CARD_COUNT = 4;

const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "UTC" });

function dayName(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

const degrees = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value)}°`;

function Dot() {
  return (
    <span className="text-border" aria-hidden>
      •
    </span>
  );
}

function ForecastCard({ day, index }: { day: ForecastDay; index: number }) {
  const condition = describeWeatherCode(day.weatherCode);
  const isToday = index === 0;
  // Today leads with how hot it feels; the days ahead with the rain chance.
  const showFeelsLike = isToday && day.peakHeatIndexC !== null;
  const showRain = !showFeelsLike && day.rainChancePct !== null;
  const hasRange = day.minTempC != null || day.maxTempC !== null;

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        isToday ? "border-primary/25 bg-[hsl(var(--section))]" : "border-border bg-surface"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{dayName(day.date, index)}</p>

      <div className="flex items-center gap-2.5">
        <WeatherIcon kind={condition?.kind ?? null} className="size-10" />
        <div className="min-w-0">
          <p className="text-xl font-bold leading-none tabular text-[hsl(var(--primary-strong))]">
            {degrees(day.maxTempC)}
            <span className="sr-only"> high</span>
          </p>
          <p className="mt-1 truncate text-xs text-foreground">{condition?.label ?? "—"}</p>
        </div>
      </div>

      <p className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] tabular text-muted-foreground">
        {showFeelsLike && <span>Feels like {degrees(day.peakHeatIndexC)}</span>}
        {showFeelsLike && hasRange && <Dot />}
        {hasRange && (
          <span>
            <span className="sr-only">Low </span>
            {degrees(day.minTempC)} / <span className="sr-only">high </span>
            {degrees(day.maxTempC)}
          </span>
        )}
        {hasRange && showRain && <Dot />}
        {showRain && (
          <span className="flex items-center gap-1">
            <Droplet className="size-3" aria-hidden />
            {day.rainChancePct}%<span className="sr-only"> chance of rain</span>
          </span>
        )}
      </p>
    </li>
  );
}

function Heading({ location }: { location?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <CloudSun className="size-4 text-[hsl(var(--primary-strong))]" aria-hidden />
        Weather
      </h2>
      {location && (
        <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          {location}
        </p>
      )}
    </header>
  );
}

/**
 * The farm's next four days as four forecast cards. Heat warnings come
 * through the dashboard alerts (heatAlert), so the cards stay a forecast.
 * Open-Meteo's CC BY credit sits on the privacy page, where the data source
 * is disclosed.
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
  if (weather.status !== "ok" || weather.days.length === 0) {
    const message =
      weather.status === "no_location"
        ? "Add your farm's municipality and province to see the forecast."
        : weather.status === "not_found"
          ? `We couldn't find "${weather.query}". Check the spelling of your farm's municipality and province.`
          : "The forecast isn't available right now. Try again in a little while.";
    return (
      <Panel title="Weather" className={className}>
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

  return (
    <section className={cn("flex flex-col gap-2.5", className)} aria-label="Weather">
      <WeatherIconDefs />
      <Heading location={weather.label} />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {weather.days.slice(0, CARD_COUNT).map((day, index) => (
          <ForecastCard key={day.date} day={day} index={index} />
        ))}
      </ul>

      {weather.stale && (
        <p className="text-xs text-muted-foreground">
          Last updated {formatRelativeDay(weather.fetchedAt.slice(0, 10), timezone)}
        </p>
      )}
    </section>
  );
}
