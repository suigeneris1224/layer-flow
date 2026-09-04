"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

/**
 * Sales per point -- one bar per day (This month) or one per month (This
 * year), whichever the caller resolved. `label` is shown as-is, both on the
 * axis and in the tooltip, so it needs to already be exactly what the reader
 * should see ("14" for a day-of-month, "Jan" for a month).
 */
export function SalesChart({
  data,
  currency,
  emptyMessage = "No sales recorded.",
}: {
  data: { label: string; amount: number }[];
  currency: string;
  emptyMessage?: string;
}) {
  const hasSales = data.some((point) => point.amount > 0);

  if (!hasSales) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="h-[180px] w-full lg:h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            // Daily (This month, ~30 points) skips two of every three ticks
            // so they stay readable on a phone; monthly (This year, 12
            // points) has room to show every one.
            interval={data.length > 15 ? 2 : 0}
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
          />

          <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
