"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent } from "@/lib/format";

export interface HeatLayingPoint {
  day: string;
  /** Null for days after today (same as LayingRatePoint). */
  layingRate: number | null;
  /** Day's high, °C. Null when there's no weather for that day. */
  maxTempC: number | null;
}

/**
 * Laying rate against each day's high temperature, on two axes, so a farmer
 * can see for themselves whether hot spells line up with dips. No correlation
 * figure and no verdict: the picture is the point.
 */
export function HeatLayingChart({ data }: { data: HeatLayingPoint[] }) {
  const hasData =
    data.some((point) => (point.layingRate ?? 0) > 0) &&
    data.some((point) => point.maxTempC !== null);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Not enough production or weather in this period yet.
      </p>
    );
  }

  const tickInterval = Math.max(0, Math.floor(data.length / 10) - 1);

  return (
    <div>
      <div className="h-[180px] w-full lg:h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              yAxisId="rate"
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value: number) => `${value}%`}
            />
            <YAxis
              yAxisId="temp"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={36}
              domain={["dataMin - 2", "dataMax + 2"]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value: number) => `${Math.round(value)}°`}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--chart-grid))" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--surface))",
                fontSize: 12,
              }}
              formatter={(value, name) =>
                name === "maxTempC"
                  ? [typeof value === "number" ? `${Math.round(value)}°C` : "—", "High temp"]
                  : [typeof value === "number" ? formatPercent(value) : "—", "Laying rate"]
              }
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="layingRate"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="maxTempC"
              stroke="hsl(var(--chart-3))"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full bg-good" aria-hidden />
          Laying rate
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-full bg-[hsl(var(--chart-3))]"
            aria-hidden
          />
          Day&apos;s high temperature
        </span>
      </p>
    </div>
  );
}
