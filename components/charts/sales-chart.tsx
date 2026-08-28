"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

/** Daily sales across the last 30 days. */
export function SalesChart({
  data,
  currency,
}: {
  data: { day: string; amount: number }[];
  currency: string;
}) {
  const hasSales = data.some((point) => point.amount > 0);

  if (!hasSales) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No sales recorded in the last 30 days.
      </p>
    );
  }

  return (
    <div className="h-[180px] w-full lg:h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

          {/* Every third label: 30 ticks would be unreadable on a phone. */}
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval={2}
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
            formatter={(value: number) => [formatCurrency(value, currency), "Sales"]}
            labelFormatter={(label) => `Day ${label}`}
          />

          <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
