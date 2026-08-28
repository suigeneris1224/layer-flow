"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/data/dashboard";
import { formatNumber } from "@/lib/format";

/**
 * Eggs collected this week against the week before.
 *
 * Client component, imported only by the dashboard: Recharts is heavy and must
 * not land in every page's bundle (docs/design-system.md).
 */
export function ProductionChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-[180px] w-full lg:h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="thisWeekFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Horizontal only -- vertical gridlines add noise, not meaning. */}
          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => formatNumber(value)}
          />

          <Tooltip
            cursor={{ stroke: "hsl(var(--chart-grid))" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--surface))",
              fontSize: 12,
            }}
            formatter={(value: number, name) => [
              `${formatNumber(value)} eggs`,
              name === "thisWeek" ? "This week" : "Last week",
            ]}
          />

          <Area
            type="monotone"
            dataKey="lastWeek"
            stroke="hsl(var(--chart-2))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="thisWeek"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            fill="url(#thisWeekFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
