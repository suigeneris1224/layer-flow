"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyMoneyPoint } from "@/lib/data/reports";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

/** Revenue vs. operating cost per day, over the chosen range. */
export function ProfitChart({ data, currency }: { data: DailyMoneyPoint[]; currency: string }) {
  const hasData = data.some((point) => point.revenue > 0 || point.cost > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No sales or expenses recorded in this period.
      </p>
    );
  }

  const tickInterval = Math.max(0, Math.floor(data.length / 10) - 1);

  return (
    <div>
      <div className="h-[180px] w-full lg:h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
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
              width={56}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value: number) => formatCurrencyShort(value, currency)}
            />

            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--surface))",
                fontSize: 12,
              }}
              formatter={(value: number, name) => [
                formatCurrency(value, currency),
                name === "revenue" ? "Revenue" : "Cost",
              ]}
            />

            <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={12} />
            <Bar dataKey="cost" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} maxBarSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[hsl(var(--chart-1))]" aria-hidden />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[hsl(var(--chart-2))]" aria-hidden />
          Cost
        </span>
      </p>
    </div>
  );
}
