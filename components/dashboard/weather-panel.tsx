import Link from "next/link";
import { CloudRain, CloudSun, Thermometer } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { InfoTip } from "@/components/ui/info-tip";
import type { WeatherResult } from "@/lib/data/weather";
import {
  HEAT_LEVEL_LABELS,
  formatHour,
  heatIndexLevel,
  type HeatLevel,
} from "@/lib/domain/weather";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Colour is never the only signal -- the level's name is always shown too. */
const LEVEL_STYLES: Record<HeatLevel, string> = {
  none: "bg-muted text-muted-foreground",
  caution: "bg-muted text-foreground",
  extreme_caution: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  danger: "bg-destructive/10 text-destructive",
  extreme_danger: "bg-destructive/15 text-destructive",
};

const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

function dayName(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

/**
 * Three days of weather for the farm, led by the heat index -- the number
 * PAGASA warns on. Reports the forecast and PAGASA's level; what to do about
 * a hot day is the farmer's call.
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

  if (weather.status !== "ok") {
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
          {weather.status !== "unavailable" && canEditFarm && (
            <Link href="/farms" className="font-medium underline">
              Farm settings
            </Link>
          )}
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      className={className}
      action={<span className="truncate text-xs text-muted-foreground">{weather.label}</span>}
    >
      <ul className="grid grid-cols-3 gap-2">
        {weather.days.map((day, index) => {
          const level = day.peakHeatIndexC === null ? null : heatIndexLevel(day.peakHeatIndexC);
          return (
            <li key={day.date} className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
              <p className="text-xs font-medium text-muted-foreground">{dayName(day.date, index)}</p>
              <p className="flex items-center gap-1 text-lg font-semibold tabular">
                <Thermometer className="size-4 text-muted-foreground" aria-hidden />
                {day.maxTempC === null ? "—" : `${Math.round(day.maxTempC)}°`}
              </p>
              {level && day.peakHeatIndexC !== null && (
                <p className="text-xs tabular">
                  Feels {Math.round(day.peakHeatIndexC)}°
                  {day.peakHour !== null && (
                    <span className="text-muted-foreground"> · {formatHour(day.peakHour)}</span>
                  )}
                </p>
              )}
              {level && level !== "none" && (
                <span
                  className={cn(
                    "self-start rounded-full px-2 py-0.5 text-[11px] font-medium",
                    LEVEL_STYLES[level]
                  )}
                >
                  {HEAT_LEVEL_LABELS[level]}
                </span>
              )}
              {day.rainChancePct !== null && (
                <p className="flex items-center gap-1 text-xs tabular text-muted-foreground">
                  <CloudRain className="size-3" aria-hidden />
                  {day.rainChancePct}% rain
                </p>
              )}
            </li>
          );
        })}
      </ul>

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
