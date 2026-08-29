"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LayingRatePoint } from "@/lib/data/analytics";
import { formatPercent } from "@/lib/format";

/** Laying rate percentage per day, over the chosen range. */
export function LayingRateChart({ data }: { data: LayingRatePoint[] }) {
  const hasData = data.some((point) => point.layingRate > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No production recorded in this period.
      </p>
    );
  }

  // Roughly 10 ticks regardless of a 30- or 90-day range, so labels never crowd.
  const tickInterval = Math.max(0, Math.floor(data.length / 10) - 1);

  return (
    <div className="h-[180px] w-full lg:h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="layingRateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => `${value}%`}
          />

          <Tooltip
            cursor={{ stroke: "hsl(var(--chart-grid))" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--surface))",
              fontSize: 12,
            }}
            formatter={(value: number) => [formatPercent(value), "Laying rate"]}
          />

          <Area
            type="monotone"
            dataKey="layingRate"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            fill="url(#layingRateFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
