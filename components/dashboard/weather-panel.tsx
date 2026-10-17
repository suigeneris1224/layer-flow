import Link from "next/link";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSun,
  Droplet,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import type { WeatherResult } from "@/lib/data/weather";
import type { ForecastDay } from "@/lib/weather/open-meteo";
import { describeWeatherCode, type WeatherKind } from "@/lib/domain/weather";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const CARD_COUNT = 4;

/** One icon per condition, so no two conditions look alike. */
const CONDITION_ICONS: Record<WeatherKind, { icon: LucideIcon; tone: string }> = {
  clear: { icon: Sun, tone: "text-[hsl(var(--accent))]" },
  partly_cloudy: { icon: CloudSun, tone: "text-[hsl(var(--accent))]" },
  cloudy: { icon: Cloud, tone: "text-muted-foreground" },
  fog: { icon: CloudFog, tone: "text-muted-foreground" },
  drizzle: { icon: CloudDrizzle, tone: "text-muted-foreground" },
  rain: { icon: CloudRain, tone: "text-muted-foreground" },
  heavy_rain: { icon: CloudRainWind, tone: "text-muted-foreground" },
  thunderstorm: { icon: CloudLightning, tone: "text-muted-foreground" },
};

const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "UTC" });

function dayName(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

const degrees = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value)}°`;

function ForecastCard({ day, index }: { day: ForecastDay; index: number }) {
  const condition = describeWeatherCode(day.weatherCode);
  const { icon: Icon, tone } = condition
    ? CONDITION_ICONS[condition.kind]
    : { icon: Thermometer, tone: "text-muted-foreground" };
  const isToday = index === 0;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        isToday ? "border-primary/40 bg-[hsl(var(--section))]" : "border-border bg-surface"
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold",
          isToday ? "text-[hsl(var(--primary-strong))]" : "text-muted-foreground"
        )}
      >
        {dayName(day.date, index)}
      </p>

      <div className="flex items-center gap-3">
        <Icon className={cn("size-10 shrink-0", tone)} strokeWidth={1.75} aria-hidden />
        <p className="text-3xl font-semibold leading-none tabular text-foreground">
          {degrees(day.maxTempC)}
          <span className="sr-only"> high</span>
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{condition?.label ?? "—"}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular text-muted-foreground">
          {(day.minTempC != null || day.maxTempC !== null) && (
            <span>
              L {degrees(day.minTempC)} · H {degrees(day.maxTempC)}
            </span>
          )}
          {day.rainChancePct !== null && (
            <span className="flex items-center gap-1">
              <Droplet className="size-3" aria-hidden />
              {day.rainChancePct}%<span className="sr-only"> chance of rain</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The farm's next four days as four compact cards: icon, high, condition,
 * low/high and rain chance. Heat warnings come through the dashboard alerts
 * (heatAlert), so the cards stay a plain forecast.
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
    <Panel
      title="Weather"
      className={className}
      action={<span className="truncate text-xs text-muted-foreground">{weather.label}</span>}
    >
      <ul className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {weather.days.slice(0, CARD_COUNT).map((day, index) => (
          <ForecastCard key={day.date} day={day} index={index} />
        ))}
      </ul>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
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
