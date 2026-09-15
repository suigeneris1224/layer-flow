"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FlockProfitRow } from "@/lib/data/reports";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

/** Profit per flock, side by side -- green when it's actually profitable, rose when it's a loss. */
export function FlockProfitChart({
  data,
  currency,
}: {
  data: FlockProfitRow[];
  currency: string;
}) {
  if (data.length === 0) return null;

  return (
    <div className="h-[180px] w-full lg:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
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
            formatter={(value: number) => [formatCurrency(value, currency), "Profit"]}
          />

          <Bar dataKey="profit" radius={[3, 3, 0, 0]} maxBarSize={48}>
            {data.map((row) => (
              <Cell
                key={row.id}
                fill={row.profit >= 0 ? "hsl(var(--status-good))" : "hsl(var(--status-bad))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
