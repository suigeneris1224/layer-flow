import Link from "next/link";
import { CloudSun, Droplet, MapPin, Thermometer } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { InfoTip } from "@/components/ui/info-tip";
import { WeatherIcon, WeatherIconDefs } from "@/components/dashboard/weather-icon";
import type { WeatherResult } from "@/lib/data/weather";
import type { ForecastDay } from "@/lib/weather/open-meteo";
import {
  HEAT_LEVEL_LABELS,
  describeWeatherCode,
  heatIndexLevel,
  isAtLeast,
} from "@/lib/domain/weather";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const CARD_COUNT = 4;
const TITLE = "Heat & weather";

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
  const level = day.peakHeatIndexC === null ? null : heatIndexLevel(day.peakHeatIndexC);
  // Same threshold as heatAlert. "Caution" (27-32 °C) is most days here and
  // would only be noise.
  const flagged = level !== null && isAtLeast(level, "extreme_caution");

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

      <div className="mt-auto flex flex-col gap-0.5 text-[11px] tabular">
        <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
          {day.peakHeatIndexC !== null && <span>Feels {degrees(day.peakHeatIndexC)}</span>}
          {day.peakHeatIndexC !== null && day.rainChancePct !== null && <Dot />}
          {day.rainChancePct !== null && (
            <span className="flex items-center gap-1">
              <Droplet className="size-3" aria-hidden />
              {day.rainChancePct}%<span className="sr-only"> chance of rain</span>
            </span>
          )}
        </p>
        {flagged && level && (
          <p
            className={cn(
              "flex items-center gap-1 font-semibold",
              isAtLeast(level, "danger")
                ? "text-[hsl(var(--status-bad))]"
                : "text-[hsl(var(--status-warn))]"
            )}
          >
            <Thermometer className="size-3 shrink-0" aria-hidden />
            {HEAT_LEVEL_LABELS[level]}
          </p>
        )}
      </div>
    </li>
  );
}

function Heading({ location }: { location?: string }) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CloudSun className="size-4 text-[hsl(var(--primary-strong))]" aria-hidden />
          {TITLE}
          <InfoTip label="About heat warnings">
            Hot days are flagged so you can prepare your houses in time, and Analytics shows each
            day&apos;s temperature next to your laying rate. The heat index is how hot it feels
            once humidity is counted, the number PAGASA warns on: Caution 27–32°C, Extreme
            caution 33–41°C, Danger 42–51°C, Extreme danger 52°C and up.
          </InfoTip>
        </h2>
        {location && (
          <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {location}
          </p>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Heat warnings for your flock, based on PAGASA&apos;s heat index
      </p>
    </header>
  );
}

/**
 * Heat & weather: the farm's next four days, led by how hot it feels, with
 * PAGASA's level on days at Extreme caution or worse -- the reason weather
 * is in LayerFlow at all (heat stress costs eggs and birds). States the
 * weather and the level only; what to do about a hot day is the farmer's
 * call. The heat alert (heatAlert) carries the same warning to the alerts.
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
      <Panel title={TITLE} className={className}>
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
    <section className={cn("flex flex-col gap-2.5", className)} aria-label="Heat and weather">
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
