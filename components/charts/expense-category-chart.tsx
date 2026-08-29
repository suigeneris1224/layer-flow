"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryBreakdownRow } from "@/lib/data/expenses";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

const BAR_COLOURS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

/** Horizontal bar of total spend per category, highest first. */
export function ExpenseCategoryChart({
  data,
  currency,
}: {
  data: CategoryBreakdownRow[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No expenses recorded in this period.
      </p>
    );
  }

  return (
    <div style={{ height: Math.max(180, data.length * 40) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => formatCurrencyShort(value, currency)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={90}
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
          />

          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--surface))",
              fontSize: 12,
            }}
            formatter={(value: number) => [formatCurrency(value, currency), "Spend"]}
          />

          <Bar dataKey="total" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {data.map((row, index) => (
              <Cell key={row.category} fill={BAR_COLOURS[index % BAR_COLOURS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
