"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FlockComparisonRow } from "@/lib/data/analytics";
import { formatPercent } from "@/lib/format";

/** Laying rate per active flock, side by side -- the at-a-glance version of the table below it. */
export function FlockComparisonChart({ data }: { data: FlockComparisonRow[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-[180px] w-full lg:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => `${value}%`}
          />

          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--surface))",
              fontSize: 12,
            }}
            formatter={(value: number) => [formatPercent(value), "Avg laying rate"]}
          />

          <Bar dataKey="avgLayingRate" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
